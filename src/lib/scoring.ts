export type GradableQuestionType =
  | "SINGLE_CHOICE"
  | "MULTIPLE_CHOICE"
  | "TRUE_FALSE"
  | "TEXT_ANSWER";

export type GradableScoringMode = "FULL_MATCH" | "PARTIAL";

export interface GradableAnswer {
  id: string;
  isCorrect: boolean;
}

export interface GradableQuestion {
  id: string;
  type: GradableQuestionType;
  points: number;
  scoringMode?: GradableScoringMode | null;
  correctTextAnswers?: string[];
  answers: GradableAnswer[];
}

export interface StudentResponse {
  questionId: string;
  selectedAnswerIds?: string[];
  textAnswer?: string | null;
}

export interface GradedAnswer {
  questionId: string;
  isCorrect: boolean;
  pointsAwarded: number;
  answered: boolean;
}

export interface AttemptResult {
  score: number;
  maxScore: number;
  percentage: number;
  correctCount: number;
  incorrectCount: number;
  unansweredCount: number;
  totalQuestions: number;
  gradedAnswers: GradedAnswer[];
}

function isAnswered(response: StudentResponse | undefined): boolean {
  if (!response) return false;
  if (response.selectedAnswerIds && response.selectedAnswerIds.length > 0) return true;
  if (response.textAnswer && response.textAnswer.trim().length > 0) return true;
  return false;
}

function sameSet(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const setB = new Set(b);
  return a.every((v) => setB.has(v));
}

export function gradeSingleChoice(
  question: GradableQuestion,
  selectedAnswerIds: string[]
): number {
  const correctIds = question.answers.filter((a) => a.isCorrect).map((a) => a.id);
  if (selectedAnswerIds.length !== 1) return 0;
  return sameSet(selectedAnswerIds, correctIds) ? question.points : 0;
}

export function gradeTrueFalse(
  question: GradableQuestion,
  selectedAnswerIds: string[]
): number {
  return gradeSingleChoice(question, selectedAnswerIds);
}

export function gradeMultipleChoice(
  question: GradableQuestion,
  selectedAnswerIds: string[]
): number {
  const correctIds = new Set(question.answers.filter((a) => a.isCorrect).map((a) => a.id));
  const selected = new Set(selectedAnswerIds);
  const mode = question.scoringMode ?? "FULL_MATCH";

  if (correctIds.size === 0) return 0;

  if (mode === "FULL_MATCH") {
    return sameSet([...selected], [...correctIds]) ? question.points : 0;
  }

  let correctlySelected = 0;
  let incorrectlySelected = 0;
  for (const id of selected) {
    if (correctIds.has(id)) correctlySelected += 1;
    else incorrectlySelected += 1;
  }
  const rawFraction = (correctlySelected - incorrectlySelected) / correctIds.size;
  const clampedFraction = Math.max(0, Math.min(1, rawFraction));
  return Math.round(clampedFraction * question.points);
}

export function gradeTextAnswer(question: GradableQuestion, textAnswer: string | null | undefined): number {
  if (!textAnswer || textAnswer.trim().length === 0) return 0;
  const normalized = textAnswer.trim().toLowerCase();
  const accepted = question.correctTextAnswers ?? [];
  const matches = accepted.some((a) => a.trim().toLowerCase() === normalized);
  return matches ? question.points : 0;
}

export function gradeQuestion(question: GradableQuestion, response: StudentResponse | undefined): GradedAnswer {
  const answered = isAnswered(response);
  let pointsAwarded = 0;

  if (answered && response) {
    switch (question.type) {
      case "SINGLE_CHOICE":
        pointsAwarded = gradeSingleChoice(question, response.selectedAnswerIds ?? []);
        break;
      case "TRUE_FALSE":
        pointsAwarded = gradeTrueFalse(question, response.selectedAnswerIds ?? []);
        break;
      case "MULTIPLE_CHOICE":
        pointsAwarded = gradeMultipleChoice(question, response.selectedAnswerIds ?? []);
        break;
      case "TEXT_ANSWER":
        pointsAwarded = gradeTextAnswer(question, response.textAnswer);
        break;
    }
  }

  return {
    questionId: question.id,
    answered,
    pointsAwarded,
    isCorrect: answered && question.points > 0 && pointsAwarded === question.points,
  };
}

export function computeAttemptResult(
  questions: GradableQuestion[],
  responses: StudentResponse[]
): AttemptResult {
  const responseByQuestionId = new Map(responses.map((r) => [r.questionId, r]));

  const gradedAnswers = questions.map((q) => gradeQuestion(q, responseByQuestionId.get(q.id)));

  const score = gradedAnswers.reduce((sum, g) => sum + g.pointsAwarded, 0);
  const maxScore = questions.reduce((sum, q) => sum + q.points, 0);
  const correctCount = gradedAnswers.filter((g) => g.isCorrect).length;
  const unansweredCount = gradedAnswers.filter((g) => !g.answered).length;
  const incorrectCount = gradedAnswers.length - correctCount - unansweredCount;

  return {
    score,
    maxScore,
    percentage: maxScore > 0 ? Math.round((score / maxScore) * 10000) / 100 : 0,
    correctCount,
    incorrectCount,
    unansweredCount,
    totalQuestions: questions.length,
    gradedAnswers,
  };
}
