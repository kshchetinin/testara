import ExcelJS from "exceljs";

export interface ExportableAnswer {
  text: string;
  isCorrect: boolean;
}

export interface ExportableQuestion {
  order: number;
  type: "SINGLE_CHOICE" | "MULTIPLE_CHOICE" | "TRUE_FALSE" | "TEXT_ANSWER";
  text: string;
  points: number;
  answers: ExportableAnswer[];
  correctTextAnswers: string[];
}

export async function buildTestWorkbook(testTitle: string, questions: ExportableQuestion[]): Promise<ExcelJS.Workbook> {
  const maxAnswers = Math.max(0, ...questions.map((q) => q.answers.length));

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(testTitle.slice(0, 31) || "Тест");

  const headerRow = ["№", "Вопрос", ...Array.from({ length: maxAnswers }, (_, i) => `Вариант ${i + 1}`), "Правильный ответ", "Баллы"];
  sheet.addRow(headerRow);
  sheet.getRow(1).font = { bold: true };

  for (const q of questions) {
    if (q.type === "TEXT_ANSWER") {
      const row = [q.order, q.text, ...Array(maxAnswers).fill(""), q.correctTextAnswers.join("; "), q.points];
      sheet.addRow(row);
      continue;
    }

    const answerTexts = q.answers.map((a) => a.text);
    const correctIndices = q.answers
      .map((a, i) => (a.isCorrect ? i + 1 : null))
      .filter((i): i is number => i !== null)
      .join(",");
    const padded = [...answerTexts, ...Array(Math.max(0, maxAnswers - answerTexts.length)).fill("")];
    sheet.addRow([q.order, q.text, ...padded, correctIndices, q.points]);
  }

  sheet.columns.forEach((col, i) => {
    col.width = i === 1 ? 50 : i === 0 ? 6 : 20;
  });

  return workbook;
}
