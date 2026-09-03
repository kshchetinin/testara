import { prisma } from "@/lib/prisma";
import { seededShuffle } from "@/lib/shuffle";
import { computeAttemptResult, type GradableQuestion, type StudentResponse } from "@/lib/scoring";
import { logAudit } from "./auditService";

export class AssignmentNotAvailableError extends Error {
  constructor(message = "Тестирование недоступно") {
    super(message);
  }
}

export class NoAttemptsLeftError extends Error {
  constructor() {
    super("Использованы все попытки прохождения");
  }
}

function isWithinWindow(now: Date, from: Date | null, until: Date | null) {
  if (from && now < from) return false;
  if (until && now > until) return false;
  return true;
}

function attemptDeadline(startedAt: Date, timeLimitMinutes: number | null): Date | null {
  if (!timeLimitMinutes) return null;
  return new Date(startedAt.getTime() + timeLimitMinutes * 60_000);
}

function isEligible(student: { groupId: string | null }, assignment: { groups: { groupId: string }[]; students: { studentId: string }[] }, studentId: string) {
  const byGroup = !!student.groupId && assignment.groups.some((g) => g.groupId === student.groupId);
  const byStudent = assignment.students.some((s) => s.studentId === studentId);
  return byGroup || byStudent;
}

export async function listStudentAssignments(studentId: string) {
  const student = await prisma.user.findUnique({ where: { id: studentId }, select: { groupId: true } });
  if (!student) return [];

  const assignments = await prisma.testAssignment.findMany({
    where: {
      status: "ACTIVE",
      OR: [...(student.groupId ? [{ groups: { some: { groupId: student.groupId } } }] : []), { students: { some: { studentId } } }],
    },
    include: {
      testVersion: { include: { test: true, questions: { select: { id: true } } } },
      attempts: { where: { studentId }, orderBy: { attemptNumber: "desc" } },
    },
    orderBy: { createdAt: "desc" },
  });

  return assignments.map((a) => {
    const attemptsUsed = a.attempts.filter((at) => at.status !== "IN_PROGRESS").length;
    const inProgress = a.attempts.find((at) => at.status === "IN_PROGRESS");
    const lastCompleted = a.attempts.find((at) => at.status === "COMPLETED");
    const questionCount = a.questionCount ?? a.testVersion.questions.length;
    return {
      id: a.id,
      title: a.title || a.testVersion.test.title,
      testTitle: a.testVersion.test.title,
      questionCount,
      availableFrom: a.availableFrom,
      availableUntil: a.availableUntil,
      timeLimitMinutes: a.timeLimitMinutes,
      attemptsAllowed: a.attemptsAllowed,
      attemptsUsed,
      inProgressAttemptId: inProgress?.id ?? null,
      lastResult: a.showResult && lastCompleted ? { score: lastCompleted.score, maxScore: lastCompleted.maxScore, percentage: lastCompleted.percentage } : null,
      lastCompletedAttemptId: lastCompleted?.id ?? null,
      canStart: isWithinWindow(new Date(), a.availableFrom, a.availableUntil) && attemptsUsed < a.attemptsAllowed && !inProgress,
    };
  });
}

export async function getOrCreateAttempt(assignmentId: string, studentId: string) {
  const student = await prisma.user.findUnique({ where: { id: studentId }, select: { groupId: true } });
  const assignment = await prisma.testAssignment.findUnique({
    where: { id: assignmentId },
    include: { groups: true, students: true, testVersion: { include: { questions: { select: { id: true } } } } },
  });
  if (!assignment || assignment.status !== "ACTIVE") throw new AssignmentNotAvailableError();
  if (!student || !isEligible(student, assignment, studentId)) {
    throw new AssignmentNotAvailableError("Это тестирование вам не назначено");
  }

  const existing = await prisma.attempt.findFirst({
    where: { assignmentId, studentId, status: "IN_PROGRESS" },
    orderBy: { attemptNumber: "desc" },
  });

  if (existing) {
    const deadline = attemptDeadline(existing.startedAt, assignment.timeLimitMinutes);
    if (!deadline || new Date() <= deadline) {
      if (assignment.allowResume) {
        return existing;
      }
      // Resuming is disabled: re-entering via the assignment entry point forfeits
      // the in-progress attempt. The in-attempt page itself never calls this
      // function, so ordinary reloads while actively taking the test are unaffected.
      await prisma.attempt.update({ where: { id: existing.id }, data: { status: "ABANDONED", completedAt: new Date() } });
    } else {
      await prisma.attempt.update({ where: { id: existing.id }, data: { status: "EXPIRED", completedAt: new Date() } });
    }
  }

  const now = new Date();
  if (!isWithinWindow(now, assignment.availableFrom, assignment.availableUntil)) {
    throw new AssignmentNotAvailableError("Тестирование сейчас недоступно по датам");
  }

  const attemptsUsed = await prisma.attempt.count({ where: { assignmentId, studentId, status: { not: "IN_PROGRESS" } } });
  if (attemptsUsed >= assignment.attemptsAllowed) throw new NoAttemptsLeftError();

  const allQuestionIds = assignment.testVersion.questions.map((q) => q.id);
  const seed = `${assignmentId}:${studentId}:${attemptsUsed + 1}`;

  // A configured questionCount always implies drawing a random subset (each
  // attempt/student gets a different sample), independent of randomizeQuestions
  // — otherwise "20 of 50" would draw the same 20 for everyone every time.
  let questionOrder: string[];
  if (assignment.questionCount != null && assignment.questionCount < allQuestionIds.length) {
    questionOrder = seededShuffle(allQuestionIds, seed).slice(0, assignment.questionCount);
  } else if (assignment.randomizeQuestions) {
    questionOrder = seededShuffle(allQuestionIds, seed);
  } else {
    questionOrder = allQuestionIds;
  }

  return prisma.attempt.create({
    data: {
      assignmentId,
      studentId,
      attemptNumber: attemptsUsed + 1,
      status: "IN_PROGRESS",
      questionOrder,
      startedAt: now,
    },
  });
}

export class AttemptNotFoundError extends Error {
  constructor() {
    super("Попытка не найдена");
  }
}

export async function getAttemptForTaking(attemptId: string, studentId: string) {
  const attempt = await prisma.attempt.findUnique({
    where: { id: attemptId },
    include: {
      assignment: { include: { testVersion: { include: { test: true, questions: { include: { answers: true } } } } } },
      answers: true,
    },
  });
  if (!attempt || attempt.studentId !== studentId) throw new AttemptNotFoundError();

  if (attempt.status === "IN_PROGRESS") {
    const deadline = attemptDeadline(attempt.startedAt, attempt.assignment.timeLimitMinutes);
    if (deadline && new Date() > deadline) {
      await prisma.attempt.update({ where: { id: attempt.id }, data: { status: "EXPIRED", completedAt: new Date() } });
      attempt.status = "EXPIRED";
    }
  }

  const questionsById = new Map(attempt.assignment.testVersion.questions.map((q) => [q.id, q]));
  const answersByQuestionId = new Map(attempt.answers.map((a) => [a.questionId, a]));

  const questions = attempt.questionOrder
    .map((qid) => questionsById.get(qid))
    .filter((q): q is NonNullable<typeof q> => !!q)
    .map((q) => {
      const answers = attempt.assignment.randomizeAnswers
        ? seededShuffle(q.answers, `${attemptId}:${q.id}`)
        : [...q.answers].sort((a, b) => a.order - b.order);
      const saved = answersByQuestionId.get(q.id);
      return {
        id: q.id,
        type: q.type,
        text: q.text,
        points: q.points,
        answers: q.type === "TEXT_ANSWER" ? [] : answers.map((a) => ({ id: a.id, text: a.text })),
        savedAnswer: saved ? { selectedAnswerIds: saved.selectedAnswerIds, textAnswer: saved.textAnswer } : null,
      };
    });

  const deadline = attemptDeadline(attempt.startedAt, attempt.assignment.timeLimitMinutes);

  return {
    id: attempt.id,
    status: attempt.status,
    startedAt: attempt.startedAt,
    deadline,
    testTitle: attempt.assignment.testVersion.test.title,
    questions,
  };
}

export async function saveAnswer(
  attemptId: string,
  studentId: string,
  input: { questionId: string; selectedAnswerIds?: string[]; textAnswer?: string }
) {
  const attempt = await prisma.attempt.findUnique({ where: { id: attemptId }, include: { assignment: true } });
  if (!attempt || attempt.studentId !== studentId) throw new AttemptNotFoundError();
  if (attempt.status !== "IN_PROGRESS") return { saved: false as const };

  const deadline = attemptDeadline(attempt.startedAt, attempt.assignment.timeLimitMinutes);
  if (deadline && new Date() > deadline) {
    await prisma.attempt.update({ where: { id: attemptId }, data: { status: "EXPIRED", completedAt: new Date() } });
    return { saved: false as const };
  }

  await prisma.studentAnswer.upsert({
    where: { attemptId_questionId: { attemptId, questionId: input.questionId } },
    create: {
      attemptId,
      questionId: input.questionId,
      selectedAnswerIds: input.selectedAnswerIds ?? [],
      textAnswer: input.textAnswer ?? null,
    },
    update: {
      selectedAnswerIds: input.selectedAnswerIds ?? [],
      textAnswer: input.textAnswer ?? null,
    },
  });

  return { saved: true as const };
}

export async function submitAttempt(attemptId: string, studentId: string) {
  const attempt = await prisma.attempt.findUnique({ where: { id: attemptId } });
  if (!attempt || attempt.studentId !== studentId) throw new AttemptNotFoundError();

  const claim = await prisma.attempt.updateMany({
    where: { id: attemptId, studentId, status: "IN_PROGRESS" },
    data: { status: "COMPLETED", completedAt: new Date() },
  });

  if (claim.count === 0) {
    // Already finalized by a concurrent request/tab — return the existing result idempotently.
    return prisma.attempt.findUniqueOrThrow({ where: { id: attemptId } });
  }

  const full = await prisma.attempt.findUniqueOrThrow({
    where: { id: attemptId },
    include: {
      assignment: { include: { testVersion: { include: { questions: { include: { answers: true } } } } } },
      answers: true,
    },
  });

  // Only grade the questions actually drawn into this attempt (questionOrder) —
  // the version's full question bank may be larger when questionCount is set.
  const askedIds = new Set(full.questionOrder);
  const gradableQuestions: GradableQuestion[] = full.assignment.testVersion.questions
    .filter((q) => askedIds.has(q.id))
    .map((q) => ({
      id: q.id,
      type: q.type,
      points: q.points,
      scoringMode: q.scoringMode,
      correctTextAnswers: q.correctTextAnswers,
      answers: q.answers.map((a) => ({ id: a.id, isCorrect: a.isCorrect })),
    }));
  const responses: StudentResponse[] = full.answers.map((a) => ({
    questionId: a.questionId,
    selectedAnswerIds: a.selectedAnswerIds,
    textAnswer: a.textAnswer,
  }));

  const result = computeAttemptResult(gradableQuestions, responses);

  await prisma.$transaction([
    ...result.gradedAnswers.map((g) =>
      prisma.studentAnswer.updateMany({
        where: { attemptId, questionId: g.questionId },
        data: { isCorrect: g.isCorrect, pointsAwarded: g.pointsAwarded },
      })
    ),
    prisma.attempt.update({
      where: { id: attemptId },
      data: {
        score: result.score,
        maxScore: result.maxScore,
        percentage: result.percentage,
        durationSeconds: Math.round((full.completedAt!.getTime() - full.startedAt.getTime()) / 1000),
      },
    }),
  ]);

  await logAudit({ userId: studentId, action: "ATTEMPT_SUBMIT", entityType: "Attempt", entityId: attemptId, metadata: { percentage: result.percentage } });

  return prisma.attempt.findUniqueOrThrow({ where: { id: attemptId } });
}

export async function getAttemptResult(attemptId: string, studentId: string) {
  const attempt = await prisma.attempt.findUnique({
    where: { id: attemptId },
    include: {
      assignment: { include: { testVersion: { include: { test: true, questions: { include: { answers: true } } } } } },
      answers: true,
      student: { select: { id: true } },
    },
  });
  if (!attempt || attempt.studentId !== studentId) throw new AttemptNotFoundError();

  const askedIds = new Set(attempt.questionOrder);
  const answersByQuestionId = new Map(attempt.answers.map((a) => [a.questionId, a]));
  const showCorrect = attempt.assignment.showCorrectAnswers;

  const questionsById = new Map(attempt.assignment.testVersion.questions.map((q) => [q.id, q]));
  const questions = attempt.questionOrder
    .map((qid) => questionsById.get(qid))
    .filter((q): q is NonNullable<typeof q> => !!q && askedIds.has(q.id))
    .map((q) => {
      const saved = answersByQuestionId.get(q.id);
      return {
        id: q.id,
        text: q.text,
        type: q.type,
        points: q.points,
        explanation: showCorrect ? q.explanation : null,
        pointsAwarded: saved?.pointsAwarded ?? 0,
        isCorrect: saved?.isCorrect ?? false,
        answers: q.type === "TEXT_ANSWER" ? [] : q.answers.map((a) => ({ id: a.id, text: a.text, isCorrect: showCorrect ? a.isCorrect : undefined })),
        selectedAnswerIds: saved?.selectedAnswerIds ?? [],
        textAnswer: saved?.textAnswer ?? null,
        correctTextAnswers: showCorrect ? q.correctTextAnswers : undefined,
      };
    });

  return {
    id: attempt.id,
    status: attempt.status,
    testTitle: attempt.assignment.testVersion.test.title,
    score: attempt.score,
    maxScore: attempt.maxScore,
    percentage: attempt.percentage,
    durationSeconds: attempt.durationSeconds,
    showResult: attempt.assignment.showResult,
    showCorrectAnswers: attempt.assignment.showCorrectAnswers,
    questions: attempt.assignment.showCorrectAnswers ? questions : [],
  };
}
