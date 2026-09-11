import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { logAudit } from "./auditService";
import type { Role, UserStatus } from "@/generated/prisma/enums";

export interface UserFilters {
  role?: Role;
  status?: UserStatus;
  groupId?: string;
  search?: string;
}

export async function listUsers(filters: UserFilters, page = 1, pageSize = 25) {
  const where = {
    ...(filters.role ? { role: filters.role } : {}),
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.groupId ? { groupId: filters.groupId } : {}),
    ...(filters.search
      ? {
          OR: [
            { firstName: { contains: filters.search, mode: "insensitive" as const } },
            { lastName: { contains: filters.search, mode: "insensitive" as const } },
            { middleName: { contains: filters.search, mode: "insensitive" as const } },
            { login: { contains: filters.search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      include: { group: { select: { id: true, name: true } }, subjects: { select: { id: true, name: true } } },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.user.count({ where }),
  ]);

  return { users, total, page, pageSize };
}

export async function listActiveStudents() {
  return prisma.user.findMany({
    where: { role: "STUDENT", status: "ACTIVE" },
    select: { id: true, firstName: true, lastName: true, middleName: true, groupId: true, group: { select: { name: true } } },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });
}

export async function getUserDetail(id: string) {
  const user = await prisma.user.findUnique({
    where: { id },
    include: { group: true, subjects: true },
  });
  if (!user) return null;

  const attempts = await prisma.attempt.findMany({
    where: { studentId: id },
    orderBy: { startedAt: "desc" },
    include: {
      assignment: { include: { testVersion: { include: { test: true } } } },
    },
  });

  return { user, attempts };
}

export interface CreateUserInput {
  login: string;
  password: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  role: Role;
  groupId?: string | null;
  subjectIds?: string[];
}

export async function createUser(input: CreateUserInput, actorId: string) {
  const passwordHash = await bcrypt.hash(input.password, 10);
  const subjectScoped = input.role === "TEACHER" || input.role === "METHODIST";
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        login: input.login,
        passwordHash,
        firstName: input.firstName,
        lastName: input.lastName,
        middleName: input.middleName || null,
        role: input.role,
        groupId: input.role === "STUDENT" ? input.groupId ?? null : null,
        subjects: subjectScoped && input.subjectIds?.length ? { connect: input.subjectIds.map((id) => ({ id })) } : undefined,
      },
    });
    await logAudit(
      { userId: actorId, action: "USER_CREATE", entityType: "User", entityId: user.id, metadata: { login: user.login, role: user.role } },
      tx
    );
    return user;
  });
}

export interface UpdateUserInput {
  firstName?: string;
  lastName?: string;
  middleName?: string | null;
  groupId?: string | null;
  subjectIds?: string[];
}

export async function updateUser(id: string, input: UpdateUserInput, actorId: string) {
  const { subjectIds, ...rest } = input;
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.update({
      where: { id },
      data: {
        ...rest,
        ...(subjectIds !== undefined ? { subjects: { set: subjectIds.map((sid) => ({ id: sid })) } } : {}),
      },
    });
    await logAudit({ userId: actorId, action: "USER_UPDATE", entityType: "User", entityId: user.id, metadata: { ...rest, subjectIds } }, tx);
    return user;
  });
}

export async function setUserStatus(id: string, status: UserStatus, actorId: string) {
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.update({ where: { id }, data: { status } });
    await logAudit({ userId: actorId, action: "USER_STATUS_CHANGE", entityType: "User", entityId: user.id, metadata: { status } }, tx);
    return user;
  });
}

export async function resetPassword(id: string, newPassword: string, actorId: string) {
  const passwordHash = await bcrypt.hash(newPassword, 10);
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.update({ where: { id }, data: { passwordHash } });
    await logAudit({ userId: actorId, action: "USER_PASSWORD_RESET", entityType: "User", entityId: user.id }, tx);
    return user;
  });
}

export function generatePassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let out = "";
  for (let i = 0; i < 10; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}
