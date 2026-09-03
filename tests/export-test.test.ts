import { describe, expect, it } from "vitest";
import { buildTestWorkbook } from "@/lib/excel/export-test";
import { parseSpreadsheet } from "@/lib/excel/parse-workbook";
import { guessTestColumnMapping, buildQuestionRecords, validateQuestionRecord } from "@/lib/excel/tests";

describe("buildTestWorkbook", () => {
  it("produces a workbook that re-imports back into equivalent questions", async () => {
    const workbook = await buildTestWorkbook("Экспорт-тест", [
      {
        order: 1,
        type: "SINGLE_CHOICE",
        text: "Столица Франции?",
        points: 1,
        answers: [
          { text: "Париж", isCorrect: true },
          { text: "Лондон", isCorrect: false },
        ],
        correctTextAnswers: [],
      },
      {
        order: 2,
        type: "MULTIPLE_CHOICE",
        text: "Какие из них простые числа?",
        points: 2,
        answers: [
          { text: "2", isCorrect: true },
          { text: "3", isCorrect: true },
          { text: "4", isCorrect: false },
        ],
        correctTextAnswers: [],
      },
    ]);

    const buffer = await workbook.xlsx.writeBuffer();
    const { headers, rows } = await parseSpreadsheet(Buffer.from(buffer), "export.xlsx");

    expect(headers).toEqual(["№", "Вопрос", "Вариант 1", "Вариант 2", "Вариант 3", "Правильный ответ", "Баллы"]);
    expect(rows).toHaveLength(2);

    const mapping = guessTestColumnMapping(headers);
    const records = buildQuestionRecords(rows, mapping);

    expect(records[0].text).toBe("Столица Франции?");
    expect(records[0].answers).toEqual(["Париж", "Лондон"]);
    expect(records[0].correctIndices).toEqual([0]);
    expect(records[0].type).toBe("SINGLE_CHOICE");
    expect(validateQuestionRecord(records[0])).toHaveLength(0);

    expect(records[1].correctIndices).toEqual([0, 1]);
    expect(records[1].type).toBe("MULTIPLE_CHOICE");
  });

  it("exports a TEXT_ANSWER question with its accepted answers joined in the correct-answer column", async () => {
    const workbook = await buildTestWorkbook("Текстовые вопросы", [
      {
        order: 1,
        type: "TEXT_ANSWER",
        text: "Столица России?",
        points: 1,
        answers: [],
        correctTextAnswers: ["москва", "moscow"],
      },
    ]);

    const buffer = await workbook.xlsx.writeBuffer();
    const { rows } = await parseSpreadsheet(Buffer.from(buffer), "export.xlsx");

    expect(rows[0][rows[0].length - 2]).toBe("москва; moscow");
  });
});
