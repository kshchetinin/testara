export interface TestColumnMapping {
  question: number | null;
  answers: number[];
  correct: number | null;
}

const ANSWER_COL_PATTERN = /вариант\s*\d*|ответ\s*\d+|option\s*\d+/i;
const QUESTION_SYNONYMS = ["вопрос", "question"];

export function guessTestColumnMapping(headers: string[]): TestColumnMapping {
  const normalized = headers.map((h) => h.trim().toLowerCase());

  const question = normalized.findIndex((h) => QUESTION_SYNONYMS.some((s) => h.includes(s)));
  const answers = normalized.map((h, i) => (ANSWER_COL_PATTERN.test(h) ? i : -1)).filter((i) => i >= 0);

  let correct = normalized.findIndex((h) => h.includes("правильный"));
  if (correct < 0) {
    correct = normalized.length - 1;
  }

  return {
    question: question >= 0 ? question : null,
    answers,
    correct: correct >= 0 ? correct : null,
  };
}

const LETTER_INDEX: Record<string, number> = {
  а: 0,
  б: 1,
  в: 2,
  г: 3,
  д: 4,
  е: 5,
  a: 0,
  b: 1,
  c: 2,
  d: 3,
  e: 4,
};

export function resolveCorrectIndices(raw: string, answerTexts: string[]): number[] {
  const tokens = raw
    .split(/[,;/]|\sи\s/)
    .map((t) => t.trim())
    .filter(Boolean);
  const indices: number[] = [];

  for (const token of tokens) {
    const norm = token.toLowerCase().replace(/[).]/g, "");
    if (/^\d+$/.test(norm)) {
      const idx = parseInt(norm, 10) - 1;
      if (idx >= 0 && idx < answerTexts.length) indices.push(idx);
      continue;
    }
    if (norm in LETTER_INDEX) {
      const idx = LETTER_INDEX[norm];
      if (idx < answerTexts.length) indices.push(idx);
      continue;
    }
    const textIdx = answerTexts.findIndex((t) => t.trim().toLowerCase() === norm);
    if (textIdx >= 0) indices.push(textIdx);
  }

  return [...new Set(indices)];
}

export interface QuestionRecordDraft {
  rowIndex: number;
  text: string;
  answers: string[];
  correctIndices: number[];
  type: "SINGLE_CHOICE" | "MULTIPLE_CHOICE";
}

export function buildQuestionRecords(rows: string[][], mapping: TestColumnMapping): QuestionRecordDraft[] {
  return rows.map((row, rowIndex) => {
    const text = mapping.question !== null ? (row[mapping.question] ?? "").trim() : "";
    const answers = mapping.answers.map((idx) => (row[idx] ?? "").trim()).filter(Boolean);
    const rawCorrect = mapping.correct !== null ? (row[mapping.correct] ?? "").trim() : "";
    const correctIndices = resolveCorrectIndices(rawCorrect, answers);

    return {
      rowIndex,
      text,
      answers,
      correctIndices,
      type: correctIndices.length > 1 ? "MULTIPLE_CHOICE" : "SINGLE_CHOICE",
    };
  });
}

export interface QuestionValidationIssue {
  level: "error" | "warning";
  message: string;
}

export function validateQuestionRecord(q: QuestionRecordDraft): QuestionValidationIssue[] {
  const issues: QuestionValidationIssue[] = [];
  if (!q.text) issues.push({ level: "error", message: "Не указан текст вопроса" });
  if (q.answers.length < 2) issues.push({ level: "error", message: "Нужно минимум 2 варианта ответа" });
  if (q.answers.length > 0 && q.correctIndices.length === 0) {
    issues.push({ level: "error", message: "Не удалось определить правильный ответ" });
  }
  return issues;
}
