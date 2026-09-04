import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { logAudit } from "./auditService";
import { generatePassword } from "./usersService";
import type { StudentRecordDraft } from "@/lib/excel/students";

export interface StudentValidationIssue {
  level: "error" | "warning";
  message: string;
}

export interface StudentValidationResult {
  rowIndex: number;
  draft: StudentRecordDraft;
  issues: StudentValidationIssue[];
  existingUserId: string | null;
  groupExists: boolean;
}

const LOGIN_PATTERN = /^[a-zA-Z0-9_.-]{3,32}$/;

export async function validateStudentImport(drafts: StudentRecordDraft[]): Promise<StudentValidationResult[]> {
  const logins = drafts.map((d) => d.login).filter(Boolean);
  const existingUsers = logins.length
    ? await prisma.user.findMany({ where: { login: { in: logins } }, select: { id: true, login: true, role: true } })
    : [];
  const existingByLogin = new Map(existingUsers.map((u) => [u.login, u]));

  const groupNames = [...new Set(drafts.map((d) => d.groupName).filter((g): g is string => !!g))];
  const existingGroups = groupNames.length
    ? await prisma.group.findMany({ where: { name: { in: groupNames } }, select: { name: true } })
    : [];
  const existingGroupNames = new Set(existingGroups.map((g) => g.name));

  const seenLoginsInFile = new Map<string, number>();

  return drafts.map((draft) => {
    const issues: StudentValidationIssue[] = [];

    if (!draft.fullName) issues.push({ level: "error", message: "Не указано ФИО" });
    if (!draft.login) {
      issues.push({ level: "error", message: "Не указан логин" });
    } else if (!LOGIN_PATTERN.test(draft.login)) {
      issues.push({ level: "error", message: "Логин: латинские буквы, цифры, . _ -, от 3 до 32 символов" });
    }

    if (draft.login) {
      if (seenLoginsInFile.has(draft.login)) {
        issues.push({ level: "error", message: `Дублирующийся логин в файле (строка ${seenLoginsInFile.get(draft.login)! + 2})` });
      } else {
        seenLoginsInFile.set(draft.login, draft.rowIndex);
      }
    }

    const existingUser = draft.login ? existingByLogin.get(draft.login) ?? null : null;
    let existingUserId: string | null = null;
    if (existingUser) {
      if (existingUser.role === "STUDENT") {
        existingUserId = existingUser.id;
        issues.push({ level: "warning", message: "Пользователь с таким логином уже существует" });
      } else {
        // A login collision with a non-student account must never be offered as an
        // "update" target — that would let this import silently overwrite a staff
        // member's name/password.
        issues.push({ level: "error", message: "Логин уже занят пользователем другой роли" });
      }
    }

    const groupExists = draft.groupName ? existingGroupNames.has(draft.groupName) : true;
    if (draft.groupName && !groupExists) {
      issues.push({ level: "warning", message: `Группа «${draft.groupName}» будет создана автоматически` });
    }

    return { rowIndex: draft.rowIndex, draft, issues, existingUserId, groupExists };
  });
}

export type ImportRowAction = "create" | "update" | "skip";

export interface ImportRowInput extends StudentRecordDraft {
  action: ImportRowAction;
}

export interface ImportReport {
  created: number;
  updated: number;
  skipped: number;
  failed: { rowIndex: number; message: string }[];
}

export async function commitStudentImport(rows: ImportRowInput[], actorId: string): Promise<ImportReport> {
  let created = 0;
  let updated = 0;
  let skipped = 0;
  const failed: { rowIndex: number; message: string }[] = [];
  const groupCache = new Map<string, string>();

  for (const row of rows) {
    if (row.action === "skip") {
      skipped++;
      continue;
    }
    try {
      let groupId: string | null = null;
      if (row.groupName) {
        if (!groupCache.has(row.groupName)) {
          const group = await prisma.group.upsert({
            where: { name: row.groupName },
            update: {},
            create: { name: row.groupName },
          });
          groupCache.set(row.groupName, group.id);
        }
        groupId = groupCache.get(row.groupName) ?? null;
      }

      if (row.action === "create") {
        const passwordHash = await bcrypt.hash(row.password || generatePassword(), 10);
        await prisma.user.create({
          data: {
            login: row.login,
            passwordHash,
            firstName: row.firstName,
            lastName: row.lastName,
            middleName: row.middleName,
            role: "STUDENT",
            groupId,
          },
        });
        created++;
      } else if (row.action === "update") {
        // Re-check role at commit time, not just at validation time — the two
        // steps are separate requests, and this must never overwrite a
        // non-student account (e.g. one created between validate and commit).
        const existing = await prisma.user.findUnique({ where: { login: row.login }, select: { role: true } });
        if (!existing || existing.role !== "STUDENT") {
          failed.push({ rowIndex: row.rowIndex, message: "Логин принадлежит пользователю другой роли — обновление отклонено" });
          continue;
        }
        const data: Record<string, unknown> = {
          firstName: row.firstName,
          lastName: row.lastName,
          middleName: row.middleName,
          groupId,
        };
        if (row.password) {
          data.passwordHash = await bcrypt.hash(row.password, 10);
        }
        await prisma.user.update({ where: { login: row.login }, data });
        updated++;
      }
    } catch (error) {
      failed.push({ rowIndex: row.rowIndex, message: error instanceof Error ? error.message : "Неизвестная ошибка" });
    }
  }

  await logAudit({
    userId: actorId,
    action: "USER_IMPORT",
    entityType: "User",
    metadata: { created, updated, skipped, failed: failed.length },
  });

  return { created, updated, skipped, failed };
}
