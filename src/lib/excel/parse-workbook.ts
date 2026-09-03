import ExcelJS from "exceljs";
import { Readable } from "node:stream";

export interface ParsedSheet {
  headers: string[];
  rows: string[][];
}

function cellToString(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object") {
    if ("richText" in value && Array.isArray(value.richText)) {
      return value.richText.map((t) => t.text).join("");
    }
    if ("text" in value) return String((value as { text: unknown }).text);
    if ("result" in value) return String((value as { result: unknown }).result);
    if ("hyperlink" in value) return String((value as { hyperlink: unknown }).hyperlink);
  }
  return String(value);
}

export async function parseSpreadsheet(buffer: Buffer, filename: string): Promise<ParsedSheet> {
  const isCsv = filename.toLowerCase().endsWith(".csv");
  const workbook = new ExcelJS.Workbook();

  if (isCsv) {
    await workbook.csv.read(Readable.from(buffer));
  } else {
    await workbook.xlsx.load(buffer as unknown as Parameters<typeof workbook.xlsx.load>[0]);
  }

  const sheet = workbook.worksheets[0];
  if (!sheet) return { headers: [], rows: [] };

  const allRows: string[][] = [];
  sheet.eachRow((row) => {
    const values = (row.values as ExcelJS.CellValue[]).slice(1);
    allRows.push(values.map(cellToString));
  });

  const [headers, ...rows] = allRows;
  const nonEmptyRows = rows.filter((r) => r.some((cell) => cell.trim().length > 0));
  return { headers: headers ?? [], rows: nonEmptyRows };
}
