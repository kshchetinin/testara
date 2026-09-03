import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { promises as fs } from "node:fs";
import path from "node:path";
import ExcelJS from "exceljs";
import { prisma } from "@/lib/prisma";
import { parseSpreadsheet } from "@/lib/excel/parse-workbook";
import { guessColumnMapping, buildStudentRecords } from "@/lib/excel/students";
import { validateStudentImport, commitStudentImport } from "@/server/services/usersImportService";

const FIXTURE_PATH = path.join(process.cwd(), "tests", "__fixtures__", "students-import-test.xlsx");

async function writeFixture() {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Студенты");
  ws.addRow(["ФИО", "Логин", "Пароль", "Группа"]);
  ws.addRow(["Смирнов Алексей Викторович", "test_smirnov_it", "", "TEST-403"]);
  ws.addRow(["Кузнецова Дарья Олеговна", "test_kuznetsova_it", "", "TEST-403"]);
  ws.addRow(["Дубликат Дубликатов", "test_smirnov_it", "", "TEST-403"]);
  ws.addRow(["Без Логина Совсем", "", "", "TEST-403"]);
  await fs.mkdir(path.dirname(FIXTURE_PATH), { recursive: true });
  await wb.xlsx.writeFile(FIXTURE_PATH);
}

async function cleanup() {
  await prisma.user.deleteMany({ where: { login: { in: ["test_smirnov_it", "test_kuznetsova_it"] } } });
  await prisma.group.deleteMany({ where: { name: "TEST-403" } });
  await fs.rm(FIXTURE_PATH, { force: true });
}

describe("student import pipeline (parse -> validate -> commit)", () => {
  beforeAll(async () => {
    await cleanup();
    await writeFixture();
  });

  afterAll(async () => {
    await cleanup();
    await prisma.$disconnect();
  });

  it("parses the workbook into headers and rows", async () => {
    const buffer = await fs.readFile(FIXTURE_PATH);
    const { headers, rows } = await parseSpreadsheet(buffer, "students-import-test.xlsx");
    expect(headers).toEqual(["ФИО", "Логин", "Пароль", "Группа"]);
    expect(rows).toHaveLength(4);
  });

  it("auto-guesses the column mapping from Russian headers", async () => {
    const buffer = await fs.readFile(FIXTURE_PATH);
    const { headers } = await parseSpreadsheet(buffer, "students-import-test.xlsx");
    const mapping = guessColumnMapping(headers);
    expect(mapping).toEqual({ fullName: 0, login: 1, password: 2, group: 3 });
  });

  it("flags duplicate logins within the file and missing required fields", async () => {
    const buffer = await fs.readFile(FIXTURE_PATH);
    const { headers, rows } = await parseSpreadsheet(buffer, "students-import-test.xlsx");
    const mapping = guessColumnMapping(headers);
    const drafts = buildStudentRecords(rows, mapping);
    const results = await validateStudentImport(drafts);

    expect(results).toHaveLength(4);
    expect(results[0].groupExists).toBe(false);
    expect(results[0].issues.every((i) => i.level === "warning")).toBe(true);
    expect(results[1].issues.every((i) => i.level === "warning")).toBe(true);
    expect(results[2].issues.some((i) => i.message.includes("Дублирующийся логин"))).toBe(true);
    expect(results[3].issues.some((i) => i.message.includes("Не указан логин"))).toBe(true);
  });

  it("commits valid rows, auto-creates the missing group, and skips the rest", async () => {
    const buffer = await fs.readFile(FIXTURE_PATH);
    const { headers, rows } = await parseSpreadsheet(buffer, "students-import-test.xlsx");
    const mapping = guessColumnMapping(headers);
    const drafts = buildStudentRecords(rows, mapping);

    const report = await commitStudentImport(
      drafts.map((d, i) => ({ ...d, action: i < 2 ? ("create" as const) : ("skip" as const) })),
      (await prisma.user.findFirstOrThrow({ where: { role: "ADMIN" } })).id
    );

    expect(report.created).toBe(2);
    expect(report.skipped).toBe(2);
    expect(report.failed).toHaveLength(0);

    const group = await prisma.group.findUnique({ where: { name: "TEST-403" } });
    expect(group).not.toBeNull();

    const createdUser = await prisma.user.findUnique({ where: { login: "test_smirnov_it" } });
    expect(createdUser?.firstName).toBe("Алексей");
    expect(createdUser?.lastName).toBe("Смирнов");
    expect(createdUser?.role).toBe("STUDENT");
    expect(createdUser?.groupId).toBe(group?.id);
  });

  it("updates an existing user on re-import with action=update", async () => {
    const existing = await prisma.user.findUniqueOrThrow({ where: { login: "test_smirnov_it" } });
    const admin = await prisma.user.findFirstOrThrow({ where: { role: "ADMIN" } });

    const report = await commitStudentImport(
      [
        {
          rowIndex: 0,
          fullName: "Смирнов Алексей Обновлённый",
          lastName: "Смирнов",
          firstName: "Алексей",
          middleName: "Обновлённый",
          login: "test_smirnov_it",
          password: null,
          groupName: "TEST-403",
          action: "update",
        },
      ],
      admin.id
    );

    expect(report.updated).toBe(1);
    const updated = await prisma.user.findUniqueOrThrow({ where: { id: existing.id } });
    expect(updated.middleName).toBe("Обновлённый");
  });
});
