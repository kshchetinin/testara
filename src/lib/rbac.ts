import type { Role } from "@/generated/prisma/enums";

export const STAFF_ROLES: Role[] = ["ADMIN", "METHODIST", "TEACHER"];
export const TEST_MANAGER_ROLES: Role[] = ["ADMIN", "METHODIST"];
export const STUDENT_MANAGER_ROLES: Role[] = ["ADMIN", "METHODIST"];
// Roles that must be assigned to at least one subject/department.
export const SUBJECT_SCOPED_ROLES: Role[] = ["METHODIST", "TEACHER"];

export function canManageTests(role: Role): boolean {
  return TEST_MANAGER_ROLES.includes(role);
}

export function canManageUsers(role: Role): boolean {
  return role === "ADMIN";
}

export function canManageStudents(role: Role): boolean {
  return STUDENT_MANAGER_ROLES.includes(role);
}

export function canManageSubjects(role: Role): boolean {
  return role === "ADMIN";
}

export function isSubjectScoped(role: Role): boolean {
  return SUBJECT_SCOPED_ROLES.includes(role);
}

export function roleLabel(role: Role): string {
  switch (role) {
    case "ADMIN":
      return "Администратор";
    case "METHODIST":
      return "Методист";
    case "TEACHER":
      return "Преподаватель";
    case "STUDENT":
      return "Студент";
  }
}

export function roleHome(role: Role): string {
  switch (role) {
    case "ADMIN":
      return "/admin";
    case "METHODIST":
    case "TEACHER":
      return "/teacher";
    case "STUDENT":
      return "/student";
  }
}

export class ForbiddenError extends Error {
  constructor(message = "Доступ запрещён") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export function requireRole(role: Role | undefined, allowed: Role[]): void {
  if (!role || !allowed.includes(role)) {
    throw new ForbiddenError();
  }
}
