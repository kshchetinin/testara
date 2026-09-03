import { describe, expect, it } from "vitest";
import {
  computeAttemptResult,
  gradeMultipleChoice,
  gradeSingleChoice,
  gradeTextAnswer,
  gradeTrueFalse,
  type GradableQuestion,
} from "@/lib/scoring";

const singleChoice: GradableQuestion = {
  id: "q1",
  type: "SINGLE_CHOICE",
  points: 2,
  answers: [
    { id: "a1", isCorrect: true },
    { id: "a2", isCorrect: false },
    { id: "a3", isCorrect: false },
  ],
};

const trueFalse: GradableQuestion = {
  id: "q2",
  type: "TRUE_FALSE",
  points: 1,
  answers: [
    { id: "t", isCorrect: true },
    { id: "f", isCorrect: false },
  ],
};

const multipleChoiceFull: GradableQuestion = {
  id: "q3",
  type: "MULTIPLE_CHOICE",
  points: 4,
  scoringMode: "FULL_MATCH",
  answers: [
    { id: "a1", isCorrect: true },
    { id: "a2", isCorrect: true },
    { id: "a3", isCorrect: false },
    { id: "a4", isCorrect: false },
  ],
};

const multipleChoicePartial: GradableQuestion = {
  ...multipleChoiceFull,
  id: "q4",
  scoringMode: "PARTIAL",
};

const textAnswer: GradableQuestion = {
  id: "q5",
  type: "TEXT_ANSWER",
  points: 1,
  answers: [],
  correctTextAnswers: ["метастазирование", "метастазы"],
};

describe("gradeSingleChoice", () => {
  it("awards full points for the correct answer", () => {
    expect(gradeSingleChoice(singleChoice, ["a1"])).toBe(2);
  });

  it("awards zero for a wrong answer", () => {
    expect(gradeSingleChoice(singleChoice, ["a2"])).toBe(0);
  });

  it("awards zero when more than one option is selected", () => {
    expect(gradeSingleChoice(singleChoice, ["a1", "a2"])).toBe(0);
  });

  it("awards zero when nothing is selected", () => {
    expect(gradeSingleChoice(singleChoice, [])).toBe(0);
  });
});

describe("gradeTrueFalse", () => {
  it("behaves like single choice", () => {
    expect(gradeTrueFalse(trueFalse, ["t"])).toBe(1);
    expect(gradeTrueFalse(trueFalse, ["f"])).toBe(0);
  });
});

describe("gradeMultipleChoice — FULL_MATCH", () => {
  it("awards full points only for an exact set match", () => {
    expect(gradeMultipleChoice(multipleChoiceFull, ["a1", "a2"])).toBe(4);
  });

  it("awards zero for a partial match", () => {
    expect(gradeMultipleChoice(multipleChoiceFull, ["a1"])).toBe(0);
  });

  it("awards zero when an incorrect option is included", () => {
    expect(gradeMultipleChoice(multipleChoiceFull, ["a1", "a2", "a3"])).toBe(0);
  });
});

describe("gradeMultipleChoice — PARTIAL", () => {
  it("awards full points for an exact match", () => {
    expect(gradeMultipleChoice(multipleChoicePartial, ["a1", "a2"])).toBe(4);
  });

  it("awards proportional credit for a partial match", () => {
    expect(gradeMultipleChoice(multipleChoicePartial, ["a1"])).toBe(2);
  });

  it("never awards negative points — wrong selections cancel correct ones down to zero", () => {
    expect(gradeMultipleChoice(multipleChoicePartial, ["a1", "a3", "a4"])).toBe(0);
  });

  it("nets correct and incorrect selections", () => {
    expect(gradeMultipleChoice(multipleChoicePartial, ["a1", "a2", "a3"])).toBe(2);
  });
});

describe("gradeTextAnswer", () => {
  it("matches case-insensitively and trims whitespace", () => {
    expect(gradeTextAnswer(textAnswer, "  Метастазирование  ")).toBe(1);
  });

  it("matches any accepted alternative", () => {
    expect(gradeTextAnswer(textAnswer, "метастазы")).toBe(1);
  });

  it("awards zero for an unrecognised answer", () => {
    expect(gradeTextAnswer(textAnswer, "неверно")).toBe(0);
  });

  it("awards zero for an empty answer", () => {
    expect(gradeTextAnswer(textAnswer, "")).toBe(0);
    expect(gradeTextAnswer(textAnswer, null)).toBe(0);
    expect(gradeTextAnswer(textAnswer, undefined)).toBe(0);
  });
});

describe("computeAttemptResult", () => {
  const questions = [singleChoice, trueFalse, multipleChoiceFull, textAnswer];

  it("aggregates score, percentage and per-question counts", () => {
    const result = computeAttemptResult(questions, [
      { questionId: "q1", selectedAnswerIds: ["a1"] },
      { questionId: "q2", selectedAnswerIds: ["f"] },
      { questionId: "q3", selectedAnswerIds: ["a1", "a2"] },
    ]);

    expect(result.maxScore).toBe(2 + 1 + 4 + 1);
    expect(result.score).toBe(2 + 0 + 4 + 0);
    expect(result.correctCount).toBe(2);
    expect(result.incorrectCount).toBe(1);
    expect(result.unansweredCount).toBe(1);
    expect(result.totalQuestions).toBe(4);
    expect(result.percentage).toBeCloseTo((6 / 8) * 100, 2);
  });

  it("returns zero percentage when there are no questions", () => {
    const result = computeAttemptResult([], []);
    expect(result.percentage).toBe(0);
    expect(result.maxScore).toBe(0);
  });
});
