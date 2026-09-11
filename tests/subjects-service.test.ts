import { afterAll, beforeAll, describe, expect, it } from "vitest";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createTest, replaceQuestions, publishVersion, listTests } from "@/server/services/testsService";
import { getUserSubjectIds } from "@/server/services/subjectsService";
import { getOrCreateAttempt } from "@/server/services/attemptsService";
import {
  createAssignment,
  deleteAssignment,
  SubjectNotAllowedError,
  ForbiddenAssignmentDeleteError,
  AssignmentHasAttemptsError,
} from "@/server/services/assignmentsService";

describe("subject scoping and assignment deletion", () => {
  let adminId: string;
  let ownerTeacherId: string;
  let otherTeacherId: string;
  let groupId: string;
  let studentId: string;
  let subjectAId: string;
  let subjectBId: string;
  let testAId: string;
  let publishedVersionAId: string;

  beforeAll(async () => {
    const admin = await prisma.user.findFirstOrThrow({ where: { role: "ADMIN" } });
    adminId = admin.id;

    const subjectA = await prisma.subject.upsert({ where: { name: "IT-SUBJECT-A" }, update: {}, create: { name: "IT-SUBJECT-A" } });
    subjectAId = subjectA.id;
    const subjectB = await prisma.subject.upsert({ where: { name: "IT-SUBJECT-B" }, update: {}, create: { name: "IT-SUBJECT-B" } });
    subjectBId = subjectB.id;

    const passwordHash = await bcrypt.hash("test123", 10);
    const ownerTeacher = await prisma.user.create({
      data: {
        login: "it_subject_owner",
        passwordHash,
        firstName: "Владелец",
        lastName: "Назначения",
        role: "TEACHER",
        subjects: { connect: [{ id: subjectAId }] },
      },
    });
    ownerTeacherId = ownerTeacher.id;
    const otherTeacher = await prisma.user.create({
      data: {
        login: "it_subject_other",
        passwordHash,
        firstName: "Другой",
        lastName: "Преподаватель",
        role: "TEACHER",
        subjects: { connect: [{ id: subjectBId }] },
      },
    });
    otherTeacherId = otherTeacher.id;

    const group = await prisma.group.create({ data: { name: "IT-SUBJECT-GROUP" } });
    groupId = group.id;
    const student = await prisma.user.create({
      data: { login: "it_subject_student", passwordHash, firstName: "Студент", lastName: "Предметный", role: "STUDENT", groupId },
    });
    studentId = student.id;

    const { test, version } = await createTest({ title: "IT: Тест по предмету A", subjectId: subjectAId }, adminId);
    testAId = test.id;
    await replaceQuestions(
      version.id,
      [{ type: "SINGLE_CHOICE", text: "Q?", points: 1, answers: [{ text: "A", isCorrect: true }, { text: "B", isCorrect: false }] }],
      adminId
    );
    const published = await publishVersion(version.id, adminId);
    publishedVersionAId = published.id;
  });

  afterAll(async () => {
    const assignmentIds = (await prisma.testAssignment.findMany({ where: { testVersionId: publishedVersionAId }, select: { id: true } })).map(
      (a) => a.id
    );
    await prisma.studentAnswer.deleteMany({ where: { attempt: { assignmentId: { in: assignmentIds } } } });
    await prisma.attempt.deleteMany({ where: { assignmentId: { in: assignmentIds } } });
    await prisma.assignmentGroup.deleteMany({ where: { assignmentId: { in: assignmentIds } } });
    await prisma.assignmentStudent.deleteMany({ where: { assignmentId: { in: assignmentIds } } });
    await prisma.testAssignment.deleteMany({ where: { testVersionId: publishedVersionAId } });
    const versions = await prisma.testVersion.findMany({ where: { testId: testAId } });
    const versionIds = versions.map((v) => v.id);
    const questions = await prisma.question.findMany({ where: { testVersionId: { in: versionIds } } });
    await prisma.answer.deleteMany({ where: { questionId: { in: questions.map((q) => q.id) } } });
    await prisma.question.deleteMany({ where: { testVersionId: { in: versionIds } } });
    await prisma.testVersion.deleteMany({ where: { testId: testAId } });
    await prisma.test.delete({ where: { id: testAId } });
    await prisma.user.deleteMany({ where: { login: { in: ["it_subject_owner", "it_subject_other", "it_subject_student"] } } });
    await prisma.group.delete({ where: { id: groupId } });
    await prisma.subject.delete({ where: { id: subjectAId } });
    await prisma.subject.delete({ where: { id: subjectBId } });
    await prisma.$disconnect();
  });

  it("getUserSubjectIds returns exactly the subjects a user is connected to", async () => {
    expect(await getUserSubjectIds(ownerTeacherId)).toEqual([subjectAId]);
    expect(await getUserSubjectIds(otherTeacherId)).toEqual([subjectBId]);
  });

  it("listTests scoped to a subject excludes tests from other subjects", async () => {
    const scoped = await listTests({ subjectIds: [subjectBId] });
    expect(scoped.find((t) => t.id === testAId)).toBeUndefined();

    const unscoped = await listTests({ subjectIds: [subjectAId] });
    expect(unscoped.find((t) => t.id === testAId)).toBeDefined();
  });

  it("createAssignment rejects a test outside the actor's allowed subjects", async () => {
    await expect(
      createAssignment(
        {
          testVersionId: publishedVersionAId,
          groupIds: [groupId],
          attemptsAllowed: 1,
          randomizeQuestions: false,
          randomizeAnswers: false,
          showResult: true,
          showCorrectAnswers: true,
          allowResume: true,
        },
        otherTeacherId,
        [subjectBId]
      )
    ).rejects.toBeInstanceOf(SubjectNotAllowedError);
  });

  it("deleteAssignment refuses a non-owner, non-admin actor", async () => {
    const assignment = await createAssignment(
      {
        testVersionId: publishedVersionAId,
        groupIds: [groupId],
        attemptsAllowed: 1,
        randomizeQuestions: false,
        randomizeAnswers: false,
        showResult: true,
        showCorrectAnswers: true,
        allowResume: true,
      },
      ownerTeacherId,
      [subjectAId]
    );

    await expect(deleteAssignment(assignment.id, otherTeacherId, false)).rejects.toBeInstanceOf(ForbiddenAssignmentDeleteError);

    // the owner themself can still delete it — confirms the rejection above was
    // specifically about ownership, not some other blocker
    const deleted = await deleteAssignment(assignment.id, ownerTeacherId, false);
    expect(deleted?.id).toBe(assignment.id);
    expect(await prisma.testAssignment.findUnique({ where: { id: assignment.id } })).toBeNull();
  });

  it("deleteAssignment refuses once a student has an attempt, even for the owner", async () => {
    const assignment = await createAssignment(
      {
        testVersionId: publishedVersionAId,
        groupIds: [groupId],
        attemptsAllowed: 1,
        randomizeQuestions: false,
        randomizeAnswers: false,
        showResult: true,
        showCorrectAnswers: true,
        allowResume: true,
      },
      ownerTeacherId,
      [subjectAId]
    );

    await getOrCreateAttempt(assignment.id, studentId);

    await expect(deleteAssignment(assignment.id, ownerTeacherId, false)).rejects.toBeInstanceOf(AssignmentHasAttemptsError);
    // ADMIN is held to the same no-attempts guard
    await expect(deleteAssignment(assignment.id, adminId, true)).rejects.toBeInstanceOf(AssignmentHasAttemptsError);
  });
});
