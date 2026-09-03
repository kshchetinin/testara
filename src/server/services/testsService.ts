import { prisma } from "@/lib/prisma";
import { logAudit } from "./auditService";
import type { QuestionType, ScoringMode } from "@/generated/prisma/enums";

export async function listTests() {
  return prisma.test.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      author: { select: { firstName: true, lastName: true } },
      versions: {
        orderBy: { versionNumber: "desc" },
        select: { id: true, versionNumber: true, status: true, publishedAt: true, _count: { select: { questions: true } } },
      },
    },
  });
}

export async function getTestWithVersions(testId: string) {
  return prisma.test.findUnique({
    where: { id: testId },
    include: {
      author: { select: { firstName: true, lastName: true } },
      versions: {
        orderBy: { versionNumber: "desc" },
        include: { _count: { select: { questions: true, assignments: true } } },
      },
    },
  });
}

export interface CreateTestInput {
  title: string;
  description?: string;
  subject: string;
  topic?: string;
}

export async function createTest(input: CreateTestInput, actorId: string) {
  return prisma.$transaction(async (tx) => {
    const test = await tx.test.create({
      data: {
        title: input.title,
        description: input.description || null,
        subject: input.subject,
        topic: input.topic || null,
        authorId: actorId,
      },
    });
    const version = await tx.testVersion.create({
      data: { testId: test.id, versionNumber: 1, status: "DRAFT", createdById: actorId },
    });
    await logAudit({ userId: actorId, action: "TEST_CREATE", entityType: "Test", entityId: test.id, metadata: { title: test.title } }, tx);
    return { test, version };
  });
}

export interface UpdateTestInput {
  title?: string;
  description?: string | null;
  subject?: string;
  topic?: string | null;
  status?: "ACTIVE" | "ARCHIVED";
}

export async function updateTest(id: string, input: UpdateTestInput, actorId: string) {
  return prisma.$transaction(async (tx) => {
    const test = await tx.test.update({ where: { id }, data: input });
    await logAudit({ userId: actorId, action: "TEST_UPDATE", entityType: "Test", entityId: test.id, metadata: { ...input } }, tx);
    return test;
  });
}

export async function getVersionForEdit(versionId: string) {
  return prisma.testVersion.findUnique({
    where: { id: versionId },
    include: {
      test: true,
      questions: {
        orderBy: { order: "asc" },
        include: { answers: { orderBy: { order: "asc" } } },
      },
    },
  });
}

export interface QuestionInput {
  type: QuestionType;
  text: string;
  explanation?: string;
  points: number;
  scoringMode?: ScoringMode;
  correctTextAnswers?: string[];
  answers?: { text: string; isCorrect: boolean }[];
}

export class TestVersionNotEditableError extends Error {
  constructor() {
    super("Эта версия теста уже опубликована и недоступна для редактирования");
  }
}

export async function replaceQuestions(versionId: string, questions: QuestionInput[], actorId: string) {
  const version = await prisma.testVersion.findUnique({ where: { id: versionId } });
  if (!version) throw new Error("Версия теста не найдена");
  if (version.status !== "DRAFT") throw new TestVersionNotEditableError();

  return prisma.$transaction(async (tx) => {
    await tx.answer.deleteMany({ where: { question: { testVersionId: versionId } } });
    await tx.question.deleteMany({ where: { testVersionId: versionId } });

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      await tx.question.create({
        data: {
          testVersionId: versionId,
          type: q.type,
          text: q.text,
          explanation: q.explanation || null,
          points: q.points,
          order: i + 1,
          scoringMode: q.type === "MULTIPLE_CHOICE" ? q.scoringMode ?? "FULL_MATCH" : null,
          correctTextAnswers: q.type === "TEXT_ANSWER" ? q.correctTextAnswers ?? [] : [],
          answers:
            q.type === "TEXT_ANSWER"
              ? undefined
              : {
                  create: (q.answers ?? []).map((a, j) => ({ text: a.text, isCorrect: a.isCorrect, order: j + 1 })),
                },
        },
      });
    }

    await logAudit(
      { userId: actorId, action: "TEST_QUESTIONS_UPDATE", entityType: "TestVersion", entityId: versionId, metadata: { count: questions.length } },
      tx
    );

    return tx.testVersion.findUnique({
      where: { id: versionId },
      include: { questions: { orderBy: { order: "asc" }, include: { answers: { orderBy: { order: "asc" } } } } },
    });
  });
}

export class EmptyTestVersionError extends Error {
  constructor() {
    super("Нельзя опубликовать тест без вопросов");
  }
}

export async function publishVersion(versionId: string, actorId: string) {
  const version = await prisma.testVersion.findUnique({ where: { id: versionId }, include: { _count: { select: { questions: true } } } });
  if (!version) throw new Error("Версия теста не найдена");
  if (version.status !== "DRAFT") throw new TestVersionNotEditableError();
  if (version._count.questions === 0) throw new EmptyTestVersionError();

  return prisma.$transaction(async (tx) => {
    const updated = await tx.testVersion.update({ where: { id: versionId }, data: { status: "PUBLISHED", publishedAt: new Date() } });
    await logAudit({ userId: actorId, action: "TEST_PUBLISH", entityType: "TestVersion", entityId: versionId }, tx);
    return updated;
  });
}

export interface ImportedQuestionInput {
  text: string;
  answers: string[];
  correctIndices: number[];
  type: "SINGLE_CHOICE" | "MULTIPLE_CHOICE";
}

export async function createTestFromImport(
  meta: CreateTestInput,
  questions: ImportedQuestionInput[],
  actorId: string
) {
  return prisma.$transaction(async (tx) => {
    const test = await tx.test.create({
      data: {
        title: meta.title,
        description: meta.description || null,
        subject: meta.subject,
        topic: meta.topic || null,
        authorId: actorId,
      },
    });
    const version = await tx.testVersion.create({
      data: {
        testId: test.id,
        versionNumber: 1,
        status: "DRAFT",
        createdById: actorId,
        questions: {
          create: questions.map((q, i) => ({
            type: q.type,
            text: q.text,
            points: 1,
            order: i + 1,
            scoringMode: q.type === "MULTIPLE_CHOICE" ? "FULL_MATCH" : null,
            answers: {
              create: q.answers.map((text, j) => ({ text, isCorrect: q.correctIndices.includes(j), order: j + 1 })),
            },
          })),
        },
      },
    });
    await logAudit(
      { userId: actorId, action: "TEST_IMPORT", entityType: "Test", entityId: test.id, metadata: { title: test.title, questions: questions.length } },
      tx
    );
    return { test, version };
  });
}

export async function createNewVersion(testId: string, actorId: string) {
  const existingDraft = await prisma.testVersion.findFirst({ where: { testId, status: "DRAFT" } });
  if (existingDraft) return existingDraft;

  const latest = await prisma.testVersion.findFirst({
    where: { testId },
    orderBy: { versionNumber: "desc" },
    include: { questions: { include: { answers: true } } },
  });
  if (!latest) throw new Error("У теста ещё нет ни одной версии");

  return prisma.$transaction(async (tx) => {
    const version = await tx.testVersion.create({
      data: {
        testId,
        versionNumber: latest.versionNumber + 1,
        status: "DRAFT",
        createdById: actorId,
        questions: {
          create: latest.questions.map((q) => ({
            type: q.type,
            text: q.text,
            explanation: q.explanation,
            points: q.points,
            order: q.order,
            scoringMode: q.scoringMode,
            correctTextAnswers: q.correctTextAnswers,
            answers: { create: q.answers.map((a) => ({ text: a.text, isCorrect: a.isCorrect, order: a.order })) },
          })),
        },
      },
    });
    await logAudit(
      { userId: actorId, action: "TEST_VERSION_CREATE", entityType: "TestVersion", entityId: version.id, metadata: { versionNumber: version.versionNumber } },
      tx
    );
    return version;
  });
}
