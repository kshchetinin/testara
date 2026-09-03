import { describe, expect, it } from "vitest";
import { guessTestColumnMapping, buildQuestionRecords, resolveCorrectIndices, validateQuestionRecord } from "@/lib/excel/tests";

describe("guessTestColumnMapping", () => {
  it("detects question, answer and correct-answer columns from Russian headers", () => {
    const headers = ["№", "Вопрос", "Вариант 1", "Вариант 2", "Вариант 3", "Вариант 4", "Правильный ответ"];
    const mapping = guessTestColumnMapping(headers);
    expect(mapping.question).toBe(1);
    expect(mapping.answers).toEqual([2, 3, 4, 5]);
    expect(mapping.correct).toBe(6);
  });
});

describe("resolveCorrectIndices", () => {
  const answers = ["Онкология", "Кардиология", "Неврология", "Гастроэнтерология"];

  it("resolves a 1-based numeric answer", () => {
    expect(resolveCorrectIndices("1", answers)).toEqual([0]);
  });

  it("resolves a Cyrillic letter answer", () => {
    expect(resolveCorrectIndices("Б", answers)).toEqual([1]);
  });

  it("resolves a Latin letter answer", () => {
    expect(resolveCorrectIndices("c", answers)).toEqual([2]);
  });

  it("resolves the full answer text case-insensitively", () => {
    expect(resolveCorrectIndices("кардиология", answers)).toEqual([1]);
  });

  it("resolves multiple comma-separated answers", () => {
    expect(resolveCorrectIndices("1, 3", answers)).toEqual([0, 2]);
  });

  it("returns an empty array for an unresolvable value", () => {
    expect(resolveCorrectIndices("???", answers)).toEqual([]);
  });
});

describe("buildQuestionRecords + validateQuestionRecord", () => {
  it("builds single-choice questions from a well-formed sheet", () => {
    const rows = [["1", "Что такое онкология?", "Наука об опухолях", "Наука о сердце", "", "", "1"]];
    const mapping = { question: 1, answers: [2, 3, 4, 5], correct: 6 };
    const records = buildQuestionRecords(rows, mapping);
    expect(records[0].type).toBe("SINGLE_CHOICE");
    expect(records[0].answers).toEqual(["Наука об опухолях", "Наука о сердце"]);
    expect(records[0].correctIndices).toEqual([0]);
    expect(validateQuestionRecord(records[0])).toHaveLength(0);
  });

  it("flags a row with no resolvable correct answer", () => {
    const rows = [["1", "Вопрос без ответа", "А", "Б", "", "", "???"]];
    const mapping = { question: 1, answers: [2, 3, 4, 5], correct: 6 };
    const records = buildQuestionRecords(rows, mapping);
    expect(validateQuestionRecord(records[0]).some((i) => i.message.includes("правильный ответ"))).toBe(true);
  });

  it("detects multiple correct answers as a multiple-choice question", () => {
    const rows = [["1", "Что применяется в диагностике?", "Биопсия", "КТ", "ЭКГ", "", "1,2"]];
    const mapping = { question: 1, answers: [2, 3, 4, 5], correct: 6 };
    const records = buildQuestionRecords(rows, mapping);
    expect(records[0].type).toBe("MULTIPLE_CHOICE");
    expect(records[0].correctIndices).toEqual([0, 1]);
  });
});
