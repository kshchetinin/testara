import { prisma } from "@/lib/prisma";
import { logAudit } from "./auditService";

export interface AssignmentFilters {
  createdById?: string; // "only mine" toggle
  status?: "ACTIVE" | "CLOSED";
  groupId?: string;
  topic?: string;
}

export async function listAssignments(filters: AssignmentFilters = {}) {
  return prisma.testAssignment.findMany({
    where: {
      ...(filters.createdById ? { createdById: filters.createdById } : {}),
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.groupId ? { groups: { some: { groupId: filters.groupId } } } : {}),
      ...(filters.topic ? { testVersion: { test: { topic: filters.topic } } } : {}),
    },
    orderBy: { createdAt: "desc" },
    include: {
      testVersion: { include: { test: true } },
      createdBy: { select: { firstName: true, lastName: true } },
      groups: { include: { group: true } },
      students: { include: { student: { select: { firstName: true, lastName: true } } } },
      _count: { select: { attempts: true } },
    },
  });
}

export async function listAssignmentTopics() {
  const tests = await prisma.test.findMany({ where: { topic: { not: null } }, select: { topic: true }, distinct: ["topic"] });
  return tests.map((t) => t.topic).filter((t): t is string => !!t).sort();
}

export async function getAssignmentDetail(id: string) {
  return prisma.testAssignment.findUnique({
    where: { id },
    include: {
      testVersion: { include: { test: true, questions: { select: { id: true, points: true } } } },
      createdBy: { select: { firstName: true, lastName: true } },
      groups: { include: { group: { include: { students: { where: { status: "ACTIVE" } } } } } },
      students: { include: { student: true } },
      attempts: { include: { student: { select: { id: true, firstName: true, lastName: true, groupId: true } } } },
    },
  });
}

export async function listPublishableTests() {
  return prisma.test.findMany({
    where: { status: "ACTIVE", versions: { some: { status: "PUBLISHED" } } },
    include: {
      versions: {
        where: { status: "PUBLISHED" },
        orderBy: { versionNumber: "desc" },
        take: 1,
        include: { _count: { select: { questions: true } } },
      },
    },
    orderBy: { title: "asc" },
  });
}

export interface CreateAssignmentInput {
  testVersionId: string;
  title?: string;
  groupIds: string[];
  studentIds?: string[];
  availableFrom?: Date | null;
  availableUntil?: Date | null;
  timeLimitMinutes?: number | null;
  attemptsAllowed: number;
  questionCount?: number | null;
  randomizeQuestions: boolean;
  randomizeAnswers: boolean;
  showResult: boolean;
  showCorrectAnswers: boolean;
  allowResume: boolean;
}

export class TestVersionNotPublishedError extends Error {
  constructor() {
    super("Можно назначать только опубликованную версию теста");
  }
}

export class InvalidQuestionCountError extends Error {
  constructor(total: number) {
    super(`Количество вопросов должно быть от 1 до ${total} (всего вопросов в тесте)`);
  }
}

export async function createAssignment(input: CreateAssignmentInput, actorId: string) {
  const version = await prisma.testVersion.findUnique({
    where: { id: input.testVersionId },
    include: { _count: { select: { questions: true } } },
  });
  if (!version || version.status !== "PUBLISHED") throw new TestVersionNotPublishedError();

  const groupIds = input.groupIds ?? [];
  const studentIds = input.studentIds ?? [];
  if (groupIds.length === 0 && studentIds.length === 0) {
    throw new Error("Выберите хотя бы одну группу или студента");
  }

  const totalQuestions = version._count.questions;
  if (input.questionCount != null && (input.questionCount < 1 || input.questionCount > totalQuestions)) {
    throw new InvalidQuestionCountError(totalQuestions);
  }

  return prisma.$transaction(async (tx) => {
    const assignment = await tx.testAssignment.create({
      data: {
        testVersionId: input.testVersionId,
        createdById: actorId,
        title: input.title || null,
        availableFrom: input.availableFrom ?? null,
        availableUntil: input.availableUntil ?? null,
        timeLimitMinutes: input.timeLimitMinutes ?? null,
        attemptsAllowed: input.attemptsAllowed,
        questionCount: input.questionCount ?? null,
        randomizeQuestions: input.randomizeQuestions,
        randomizeAnswers: input.randomizeAnswers,
        showResult: input.showResult,
        showCorrectAnswers: input.showCorrectAnswers,
        allowResume: input.allowResume,
        groups: { create: groupIds.map((groupId) => ({ groupId })) },
        students: { create: studentIds.map((studentId) => ({ studentId })) },
      },
    });
    await logAudit(
      {
        userId: actorId,
        action: "ASSIGNMENT_CREATE",
        entityType: "TestAssignment",
        entityId: assignment.id,
        metadata: { groupCount: groupIds.length, studentCount: studentIds.length, questionCount: input.questionCount ?? totalQuestions },
      },
      tx
    );
    return assignment;
  });
}

export async function setAssignmentStatus(id: string, status: "ACTIVE" | "CLOSED", actorId: string) {
  return prisma.$transaction(async (tx) => {
    const assignment = await tx.testAssignment.update({ where: { id }, data: { status } });
    await logAudit({ userId: actorId, action: "ASSIGNMENT_UPDATE", entityType: "TestAssignment", entityId: id, metadata: { status } }, tx);
    return assignment;
  });
}
