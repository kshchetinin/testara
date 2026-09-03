export type QuestionTypeDraft = "SINGLE_CHOICE" | "MULTIPLE_CHOICE" | "TRUE_FALSE" | "TEXT_ANSWER";

export interface AnswerDraft {
  id: string;
  text: string;
  isCorrect: boolean;
}

export interface QuestionDraft {
  id: string;
  type: QuestionTypeDraft;
  text: string;
  explanation: string;
  points: number;
  scoringMode: "FULL_MATCH" | "PARTIAL";
  answers: AnswerDraft[];
  correctTextAnswers: string[];
}

export function emptyQuestion(type: QuestionTypeDraft = "SINGLE_CHOICE"): QuestionDraft {
  const base: QuestionDraft = {
    id: crypto.randomUUID(),
    type,
    text: "",
    explanation: "",
    points: 1,
    scoringMode: "FULL_MATCH",
    answers: [],
    correctTextAnswers: [],
  };
  if (type === "TRUE_FALSE") {
    base.answers = [
      { id: crypto.randomUUID(), text: "Верно", isCorrect: true },
      { id: crypto.randomUUID(), text: "Неверно", isCorrect: false },
    ];
  } else if (type === "SINGLE_CHOICE" || type === "MULTIPLE_CHOICE") {
    base.answers = [
      { id: crypto.randomUUID(), text: "", isCorrect: false },
      { id: crypto.randomUUID(), text: "", isCorrect: false },
    ];
  }
  return base;
}

export const QUESTION_TYPE_LABELS: Record<QuestionTypeDraft, string> = {
  SINGLE_CHOICE: "Один правильный ответ",
  MULTIPLE_CHOICE: "Несколько правильных ответов",
  TRUE_FALSE: "Верно / Неверно",
  TEXT_ANSWER: "Текстовый ответ",
};
