import { afterAll, beforeAll, describe, expect, it } from "vitest";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createTest, replaceQuestions, publishVersion } from "@/server/services/testsService";
import { createAssignment } from "@/server/services/assignmentsService";
import {
  getOrCreateAttempt,
  getAttemptForTaking,
  saveAnswer,
  submitAttempt,
  getAttemptResult,
  AssignmentNotAvailableError,
  NoAttemptsLeftError,
} from "@/server/services/attemptsService";

describe("attempts service — full student lifecycle", () => {
  let adminId: string;
  let studentId: string;
  let otherGroupStudentId: string;
  let groupId: string;
  let otherGroupId: string;
  let testId: string;
  let correctAnswerId: string;
  let wrongAnswerId: string;

  async function makeAssignment(overrides: Partial<Parameters<typeof createAssignment>[0]> = {}) {
    return createAssignment(
      {
        testVersionId: (await prisma.testVersion.findFirstOrThrow({ where: { testId } })).id,
        groupIds: [groupId],
        attemptsAllowed: 1,
        randomizeQuestions: false,
        randomizeAnswers: false,
        showResult: true,
        showCorrectAnswers: true,
        allowResume: true,
        ...overrides,
      },
      adminId
    );
  }

  beforeAll(async () => {
    const admin = await prisma.user.findFirstOrThrow({ where: { role: "ADMIN" } });
    adminId = admin.id;

    const group = await prisma.group.create({ data: { name: "IT-ATTEMPT-GROUP" } });
    groupId = group.id;
    const otherGroup = await prisma.group.create({ data: { name: "IT-ATTEMPT-OTHER-GROUP" } });
    otherGroupId = otherGroup.id;

    const passwordHash = await bcrypt.hash("test123", 10);
    const student = await prisma.user.create({
      data: { login: "it_attempt_student", passwordHash, firstName: "Тест", lastName: "Студентов", role: "STUDENT", groupId },
    });
    studentId = student.id;
    const otherStudent = await prisma.user.create({
      data: { login: "it_attempt_other", passwordHash, firstName: "Другой", lastName: "Студентов", role: "STUDENT", groupId: otherGroupId },
    });
    otherGroupStudentId = otherStudent.id;

    const subject = await prisma.subject.upsert({ where: { name: "Онкология" }, update: {}, create: { name: "Онкология" } });
    const { test, version } = await createTest({ title: "IT: Тест для прохождения", subjectId: subject.id }, adminId);
    testId = test.id;
    const updated = await replaceQuestions(
      version.id,
      [
        {
          type: "SINGLE_CHOICE",
          text: "2 + 2 = ?",
          points: 1,
          answers: [
            { text: "4", isCorrect: true },
            { text: "5", isCorrect: false },
          ],
        },
        { type: "TEXT_ANSWER", text: "Столица России?", points: 1, correctTextAnswers: ["москва"] },
      ],
      adminId
    );
    correctAnswerId = updated!.questions[0].answers.find((a) => a.isCorrect)!.id;
    wrongAnswerId = updated!.questions[0].answers.find((a) => !a.isCorrect)!.id;
    await publishVersion(version.id, adminId);
  });

  afterAll(async () => {
    await prisma.studentAnswer.deleteMany({ where: { attempt: { student: { id: { in: [studentId, otherGroupStudentId] } } } } });
    await prisma.attempt.deleteMany({ where: { studentId: { in: [studentId, otherGroupStudentId] } } });
    await prisma.assignmentGroup.deleteMany({ where: { assignment: { testVersion: { testId } } } });
    await prisma.testAssignment.deleteMany({ where: { testVersion: { testId } } });
    await prisma.answer.deleteMany({ where: { question: { testVersion: { testId } } } });
    await prisma.question.deleteMany({ where: { testVersion: { testId } } });
    await prisma.testVersion.deleteMany({ where: { testId } });
    await prisma.test.delete({ where: { id: testId } });
    await prisma.user.deleteMany({ where: { id: { in: [studentId, otherGroupStudentId] } } });
    await prisma.group.deleteMany({ where: { id: { in: [groupId, otherGroupId] } } });
    await prisma.$disconnect();
  });

  it("refuses to start an attempt for a student outside the assigned group", async () => {
    const assignment = await makeAssignment();
    await expect(getOrCreateAttempt(assignment.id, otherGroupStudentId)).rejects.toBeInstanceOf(AssignmentNotAvailableError);
  });

  it("is idempotent — calling getOrCreateAttempt twice returns the same in-progress attempt", async () => {
    const assignment = await makeAssignment();
    const first = await getOrCreateAttempt(assignment.id, studentId);
    const second = await getOrCreateAttempt(assignment.id, studentId);
    expect(second.id).toBe(first.id);
    expect(second.attemptNumber).toBe(1);
  });

  it("never exposes isCorrect flags while the attempt is in progress", async () => {
    const assignment = await makeAssignment();
    const attempt = await getOrCreateAttempt(assignment.id, studentId);
    const view = await getAttemptForTaking(attempt.id, studentId);
    const serialized = JSON.stringify(view);
    expect(serialized).not.toContain("isCorrect");
  });

  it("saves answers and grades correctly on submit", async () => {
    const assignment = await makeAssignment();
    const attempt = await getOrCreateAttempt(assignment.id, studentId);
    const view = await getAttemptForTaking(attempt.id, studentId);

    await saveAnswer(attempt.id, studentId, { questionId: view.questions[0].id, selectedAnswerIds: [correctAnswerId] });
    await saveAnswer(attempt.id, studentId, { questionId: view.questions[1].id, textAnswer: "Москва" });

    const completed = await submitAttempt(attempt.id, studentId);
    expect(completed.status).toBe("COMPLETED");
    expect(completed.score).toBe(2);
    expect(completed.maxScore).toBe(2);
    expect(completed.percentage).toBe(100);
  });

  it("is idempotent — submitting twice does not re-grade or error", async () => {
    const assignment = await makeAssignment();
    const attempt = await getOrCreateAttempt(assignment.id, studentId);
    const view = await getAttemptForTaking(attempt.id, studentId);
    await saveAnswer(attempt.id, studentId, { questionId: view.questions[0].id, selectedAnswerIds: [wrongAnswerId] });

    const first = await submitAttempt(attempt.id, studentId);
    const second = await submitAttempt(attempt.id, studentId);
    expect(second.id).toBe(first.id);
    expect(second.score).toBe(first.score);
    expect(second.percentage).toBe(0);
  });

  it("enforces attemptsAllowed — refuses a new attempt once exhausted", async () => {
    const assignment = await makeAssignment({ attemptsAllowed: 1 });
    const attempt = await getOrCreateAttempt(assignment.id, studentId);
    await submitAttempt(attempt.id, studentId);
    await expect(getOrCreateAttempt(assignment.id, studentId)).rejects.toBeInstanceOf(NoAttemptsLeftError);
  });

  it("respects showCorrectAnswers=false by hiding the per-question breakdown", async () => {
    const assignment = await makeAssignment({ showCorrectAnswers: false });
    const attempt = await getOrCreateAttempt(assignment.id, studentId);
    await submitAttempt(attempt.id, studentId);
    const result = await getAttemptResult(attempt.id, studentId);
    expect(result.showResult).toBe(true);
    expect(result.questions).toHaveLength(0);
  });

  it("forfeits (ABANDONED) an in-progress attempt on re-entry when allowResume is false", async () => {
    const assignment = await makeAssignment({ allowResume: false, attemptsAllowed: 2 });
    const first = await getOrCreateAttempt(assignment.id, studentId);
    const second = await getOrCreateAttempt(assignment.id, studentId);
    expect(second.id).not.toBe(first.id);
    expect(second.attemptNumber).toBe(2);

    const abandoned = await prisma.attempt.findUniqueOrThrow({ where: { id: first.id } });
    expect(abandoned.status).toBe("ABANDONED");
  });

  it("draws only questionCount questions into the attempt, out of a larger bank", async () => {
    const assignment = await makeAssignment({ questionCount: 1 });
    const attempt = await getOrCreateAttempt(assignment.id, studentId);
    expect(attempt.questionOrder).toHaveLength(1);

    const view = await getAttemptForTaking(attempt.id, studentId);
    expect(view.questions).toHaveLength(1);
  });

  it("grades a questionCount-limited attempt against only the drawn subset, not the full bank", async () => {
    const assignment = await makeAssignment({ questionCount: 1 });
    const attempt = await getOrCreateAttempt(assignment.id, studentId);
    const view = await getAttemptForTaking(attempt.id, studentId);
    expect(view.questions).toHaveLength(1);

    const drawnQuestion = view.questions[0];
    if (drawnQuestion.type === "SINGLE_CHOICE") {
      await saveAnswer(attempt.id, studentId, { questionId: drawnQuestion.id, selectedAnswerIds: [correctAnswerId] });
    } else {
      await saveAnswer(attempt.id, studentId, { questionId: drawnQuestion.id, textAnswer: "Москва" });
    }

    const completed = await submitAttempt(attempt.id, studentId);
    expect(completed.maxScore).toBe(1);
    expect(completed.score).toBe(1);
    expect(completed.percentage).toBe(100);
  });

  it("lets an individually-targeted student (no group membership required) start and complete an attempt", async () => {
    const passwordHash = await bcrypt.hash("test123", 10);
    const soloStudent = await prisma.user.create({
      data: { login: "it_attempt_solo", passwordHash, firstName: "Соло", lastName: "Студентов", role: "STUDENT", groupId: null },
    });
    try {
      const assignment = await createAssignment(
        {
          testVersionId: (await prisma.testVersion.findFirstOrThrow({ where: { testId } })).id,
          groupIds: [],
          studentIds: [soloStudent.id],
          attemptsAllowed: 1,
          randomizeQuestions: false,
          randomizeAnswers: false,
          showResult: true,
          showCorrectAnswers: true,
          allowResume: true,
        },
        adminId
      );

      const attempt = await getOrCreateAttempt(assignment.id, soloStudent.id);
      expect(attempt.studentId).toBe(soloStudent.id);

      // A student outside both the group and the individual target list is still refused.
      await expect(getOrCreateAttempt(assignment.id, otherGroupStudentId)).rejects.toBeInstanceOf(AssignmentNotAvailableError);
    } finally {
      await prisma.studentAnswer.deleteMany({ where: { attempt: { studentId: soloStudent.id } } });
      await prisma.attempt.deleteMany({ where: { studentId: soloStudent.id } });
      await prisma.assignmentStudent.deleteMany({ where: { studentId: soloStudent.id } });
      await prisma.user.delete({ where: { id: soloStudent.id } });
    }
  });
});
