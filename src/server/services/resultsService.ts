import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";

export interface ResultsFilters {
  groupId?: string;
  testId?: string;
  versionId?: string;
  studentSearch?: string;
  dateFrom?: string;
  dateTo?: string;
  subjectIds?: string[];
}

export async function listResults(filters: ResultsFilters) {
  const where: Prisma.AttemptWhereInput = {
    status: "COMPLETED",
    ...(filters.groupId ? { student: { groupId: filters.groupId } } : {}),
    ...(filters.testId ? { assignment: { testVersion: { testId: filters.testId } } } : {}),
    ...(filters.versionId ? { assignment: { testVersionId: filters.versionId } } : {}),
    ...(filters.subjectIds ? { assignment: { testVersion: { test: { subjectId: { in: filters.subjectIds } } } } } : {}),
    ...(filters.studentSearch
      ? {
          student: {
            OR: [
              { firstName: { contains: filters.studentSearch, mode: "insensitive" } },
              { lastName: { contains: filters.studentSearch, mode: "insensitive" } },
            ],
          },
        }
      : {}),
    ...(filters.dateFrom || filters.dateTo
      ? {
          completedAt: {
            ...(filters.dateFrom ? { gte: new Date(filters.dateFrom) } : {}),
            ...(filters.dateTo ? { lte: new Date(filters.dateTo) } : {}),
          },
        }
      : {}),
  };

  return prisma.attempt.findMany({
    where,
    orderBy: { completedAt: "desc" },
    include: {
      student: { include: { group: true } },
      assignment: { include: { testVersion: { include: { test: true } } } },
    },
  });
}

export async function getAttemptDetail(attemptId: string) {
  const attempt = await prisma.attempt.findUnique({
    where: { id: attemptId },
    include: {
      student: { include: { group: true } },
      assignment: { include: { testVersion: { include: { test: true, questions: { include: { answers: true }, orderBy: { order: "asc" } } } } } },
      answers: true,
    },
  });
  if (!attempt) return null;

  // Only the questions actually drawn into this attempt (questionOrder) — the
  // version's full question bank may be larger when the assignment caps questionCount.
  const askedIds = new Set(attempt.questionOrder);
  const answersByQuestionId = new Map(attempt.answers.map((a) => [a.questionId, a]));
  const questions = attempt.assignment.testVersion.questions
    .filter((q) => askedIds.has(q.id))
    .map((q) => {
      const saved = answersByQuestionId.get(q.id);
      return {
        id: q.id,
        text: q.text,
        type: q.type,
        points: q.points,
        explanation: q.explanation,
        pointsAwarded: saved?.pointsAwarded ?? 0,
        isCorrect: saved?.isCorrect ?? false,
        answered: !!saved && (saved.selectedAnswerIds.length > 0 || !!saved.textAnswer),
        answers: q.answers.map((a) => ({ id: a.id, text: a.text, isCorrect: a.isCorrect })),
        selectedAnswerIds: saved?.selectedAnswerIds ?? [],
        textAnswer: saved?.textAnswer ?? null,
        correctTextAnswers: q.correctTextAnswers,
      };
    });

  return { attempt, questions };
}

export async function getAdjacentAttemptIds(assignmentId: string, currentAttemptId: string) {
  const attempts = await prisma.attempt.findMany({
    where: { assignmentId, status: "COMPLETED" },
    orderBy: [{ student: { lastName: "asc" } }, { student: { firstName: "asc" } }],
    select: { id: true },
  });
  const idx = attempts.findIndex((a) => a.id === currentAttemptId);
  return {
    prevId: idx > 0 ? attempts[idx - 1].id : null,
    nextId: idx >= 0 && idx < attempts.length - 1 ? attempts[idx + 1].id : null,
  };
}

export interface QuestionAnalytics {
  questionId: string;
  text: string;
  totalAnswered: number;
  correctCount: number;
  correctPercentage: number;
}

export async function getQuestionAnalytics(versionId: string): Promise<QuestionAnalytics[]> {
  const questions = await prisma.question.findMany({
    where: { testVersionId: versionId },
    orderBy: { order: "asc" },
    include: {
      studentAnswers: {
        where: { attempt: { status: "COMPLETED" } },
      },
    },
  });

  return questions.map((q) => {
    const answered = q.studentAnswers.filter((a) => a.selectedAnswerIds.length > 0 || !!a.textAnswer);
    const correct = answered.filter((a) => a.isCorrect);
    return {
      questionId: q.id,
      text: q.text,
      totalAnswered: answered.length,
      correctCount: correct.length,
      correctPercentage: answered.length > 0 ? Math.round((correct.length / answered.length) * 1000) / 10 : 0,
    };
  });
}
