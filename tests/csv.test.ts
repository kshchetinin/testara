import { describe, expect, it } from "vitest";
import { toCsv } from "@/lib/csv";

describe("toCsv", () => {
  it("joins headers and rows with semicolons (ru-RU Excel default delimiter)", () => {
    const csv = toCsv(["ФИО", "Результат"], [["Иванов Иван", 95]]);
    expect(csv).toContain("ФИО;Результат");
    expect(csv).toContain("Иванов Иван;95");
  });

  it("quotes and escapes cells containing the delimiter or quotes", () => {
    const csv = toCsv(["Название"], [['Тест "А"; версия 2']]);
    expect(csv).toContain('"Тест ""А""; версия 2"');
  });

  it("renders null/undefined cells as empty strings", () => {
    const csv = toCsv(["A", "B"], [[null, undefined]]);
    expect(csv.split("\r\n")[1]).toBe(";");
  });

  it("prefixes the output with a UTF-8 BOM for Excel compatibility", () => {
    const csv = toCsv(["A"], [["b"]]);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
  });
});
