import { afterAll, beforeAll, describe, expect, it } from "vitest";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createTest, replaceQuestions, publishVersion, createNewVersion } from "@/server/services/testsService";
import {
  createAssignment,
  setAssignmentStatus,
  getAssignmentDetail,
  TestVersionNotPublishedError,
  InvalidQuestionCountError,
} from "@/server/services/assignmentsService";

describe("assignments service", () => {
  let adminId: string;
  let groupId: string;
  let studentId: string;
  let draftVersionId: string;
  let publishedVersionId: string;
  let testId: string;

  beforeAll(async () => {
    const admin = await prisma.user.findFirstOrThrow({ where: { role: "ADMIN" } });
    adminId = admin.id;

    const group = await prisma.group.create({ data: { name: "IT-ASSIGN-GROUP" } });
    groupId = group.id;

    const student = await prisma.user.create({
      data: {
        login: "it_assign_student",
        passwordHash: await bcrypt.hash("test123", 10),
        firstName: "Назначен",
        lastName: "Индивидуально",
        role: "STUDENT",
        groupId: null,
      },
    });
    studentId = student.id;

    const subject = await prisma.subject.upsert({ where: { name: "Онкология" }, update: {}, create: { name: "Онкология" } });
    const { test, version } = await createTest({ title: "IT: Тест для назначения", subjectId: subject.id }, adminId);
    testId = test.id;
    draftVersionId = version.id;

    await replaceQuestions(
      draftVersionId,
      [
        { type: "SINGLE_CHOICE", text: "Вопрос 1?", points: 1, answers: [{ text: "Да", isCorrect: true }, { text: "Нет", isCorrect: false }] },
        { type: "SINGLE_CHOICE", text: "Вопрос 2?", points: 1, answers: [{ text: "Да", isCorrect: true }, { text: "Нет", isCorrect: false }] },
      ],
      adminId
    );
    const published = await publishVersion(draftVersionId, adminId);
    publishedVersionId = published.id;

    // create a second, still-unpublished draft version of the same test to exercise the guard
    const newDraft = await createNewVersion(testId, adminId);
    draftVersionId = newDraft.id;
  });

  afterAll(async () => {
    await prisma.assignmentStudent.deleteMany({ where: { assignment: { testVersion: { testId } } } });
    await prisma.assignmentGroup.deleteMany({ where: { assignment: { testVersion: { testId } } } });
    await prisma.testAssignment.deleteMany({ where: { testVersion: { testId } } });
    await prisma.answer.deleteMany({ where: { question: { testVersion: { testId } } } });
    await prisma.question.deleteMany({ where: { testVersion: { testId } } });
    await prisma.testVersion.deleteMany({ where: { testId } });
    await prisma.test.delete({ where: { id: testId } });
    await prisma.group.delete({ where: { id: groupId } });
    await prisma.user.delete({ where: { id: studentId } });
    await prisma.$disconnect();
  });

  it("refuses to assign a draft (unpublished) version", async () => {
    await expect(
      createAssignment(
        {
          testVersionId: draftVersionId,
          groupIds: [groupId],
          attemptsAllowed: 1,
          randomizeQuestions: false,
          randomizeAnswers: false,
          showResult: true,
          showCorrectAnswers: false,
          allowResume: true,
        },
        adminId
      )
    ).rejects.toBeInstanceOf(TestVersionNotPublishedError);
  });

  it("refuses to assign without selecting a group", async () => {
    await expect(
      createAssignment(
        {
          testVersionId: publishedVersionId,
          groupIds: [],
          attemptsAllowed: 1,
          randomizeQuestions: false,
          randomizeAnswers: false,
          showResult: true,
          showCorrectAnswers: false,
          allowResume: true,
        },
        adminId
      )
    ).rejects.toThrow();
  });

  it("creates an assignment for a published version and group", async () => {
    const assignment = await createAssignment(
      {
        testVersionId: publishedVersionId,
        groupIds: [groupId],
        attemptsAllowed: 2,
        randomizeQuestions: true,
        randomizeAnswers: true,
        showResult: true,
        showCorrectAnswers: false,
        allowResume: true,
      },
      adminId
    );
    expect(assignment.status).toBe("ACTIVE");

    const detail = await getAssignmentDetail(assignment.id);
    expect(detail?.groups).toHaveLength(1);
    expect(detail?.groups[0].group.id).toBe(groupId);
  });

  it("toggles assignment status between ACTIVE and CLOSED", async () => {
    const assignment = await createAssignment(
      {
        testVersionId: publishedVersionId,
        groupIds: [groupId],
        attemptsAllowed: 1,
        randomizeQuestions: false,
        randomizeAnswers: false,
        showResult: true,
        showCorrectAnswers: false,
        allowResume: true,
      },
      adminId
    );

    const closed = await setAssignmentStatus(assignment.id, "CLOSED", adminId);
    expect(closed.status).toBe("CLOSED");

    const reopened = await setAssignmentStatus(assignment.id, "ACTIVE", adminId);
    expect(reopened.status).toBe("ACTIVE");
  });

  it("refuses a questionCount above the version's total question count", async () => {
    await expect(
      createAssignment(
        {
          testVersionId: publishedVersionId,
          groupIds: [groupId],
          questionCount: 999,
          attemptsAllowed: 1,
          randomizeQuestions: false,
          randomizeAnswers: false,
          showResult: true,
          showCorrectAnswers: false,
          allowResume: true,
        },
        adminId
      )
    ).rejects.toBeInstanceOf(InvalidQuestionCountError);
  });

  it("refuses a questionCount below 1", async () => {
    await expect(
      createAssignment(
        {
          testVersionId: publishedVersionId,
          groupIds: [groupId],
          questionCount: 0,
          attemptsAllowed: 1,
          randomizeQuestions: false,
          randomizeAnswers: false,
          showResult: true,
          showCorrectAnswers: false,
          allowResume: true,
        },
        adminId
      )
    ).rejects.toBeInstanceOf(InvalidQuestionCountError);
  });

  it("accepts a questionCount within range and stores it", async () => {
    const assignment = await createAssignment(
      {
        testVersionId: publishedVersionId,
        groupIds: [groupId],
        questionCount: 1,
        attemptsAllowed: 1,
        randomizeQuestions: false,
        randomizeAnswers: false,
        showResult: true,
        showCorrectAnswers: false,
        allowResume: true,
      },
      adminId
    );
    expect(assignment.questionCount).toBe(1);
  });

  it("creates an assignment targeting only individual students, with no group", async () => {
    const assignment = await createAssignment(
      {
        testVersionId: publishedVersionId,
        groupIds: [],
        studentIds: [studentId],
        attemptsAllowed: 1,
        randomizeQuestions: false,
        randomizeAnswers: false,
        showResult: true,
        showCorrectAnswers: false,
        allowResume: true,
      },
      adminId
    );

    const detail = await getAssignmentDetail(assignment.id);
    expect(detail?.groups).toHaveLength(0);
    expect(detail?.students).toHaveLength(1);
    expect(detail?.students[0].student.id).toBe(studentId);
  });

  it("refuses an assignment with neither a group nor an individual student", async () => {
    await expect(
      createAssignment(
        {
          testVersionId: publishedVersionId,
          groupIds: [],
          studentIds: [],
          attemptsAllowed: 1,
          randomizeQuestions: false,
          randomizeAnswers: false,
          showResult: true,
          showCorrectAnswers: false,
          allowResume: true,
        },
        adminId
      )
    ).rejects.toThrow();
  });
});
