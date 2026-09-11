import { prisma } from "@/lib/prisma";
import { logAudit } from "./auditService";
import type { Role, SubjectStatus } from "@/generated/prisma/enums";

export async function listSubjects(includeArchived = true) {
  return prisma.subject.findMany({
    where: includeArchived ? {} : { status: "ACTIVE" },
    orderBy: { name: "asc" },
    include: { _count: { select: { teachers: true, tests: true } } },
  });
}

export async function getUserSubjectIds(userId: string): Promise<string[]> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { subjects: { select: { id: true } } },
  });
  return user?.subjects.map((s) => s.id) ?? [];
}

// Subjects a user is allowed to work within: ADMIN sees every active subject,
// TEACHER/METHODIST are limited to the ones they've been assigned.
export async function listSubjectsForUser(userId: string, role: Role) {
  if (role === "ADMIN") {
    return prisma.subject.findMany({ where: { status: "ACTIVE" }, orderBy: { name: "asc" } });
  }
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { subjects: { where: { status: "ACTIVE" }, orderBy: { name: "asc" } } },
  });
  return user?.subjects ?? [];
}

export async function createSubject(name: string, actorId: string) {
  return prisma.$transaction(async (tx) => {
    const subject = await tx.subject.create({ data: { name } });
    await logAudit({ userId: actorId, action: "SUBJECT_CREATE", entityType: "Subject", entityId: subject.id, metadata: { name } }, tx);
    return subject;
  });
}

export async function setSubjectStatus(id: string, status: SubjectStatus, actorId: string) {
  return prisma.$transaction(async (tx) => {
    const subject = await tx.subject.update({ where: { id }, data: { status } });
    await logAudit({ userId: actorId, action: "SUBJECT_STATUS_CHANGE", entityType: "Subject", entityId: subject.id, metadata: { status } }, tx);
    return subject;
  });
}

export async function renameSubject(id: string, name: string, actorId: string) {
  return prisma.$transaction(async (tx) => {
    const subject = await tx.subject.update({ where: { id }, data: { name } });
    await logAudit({ userId: actorId, action: "SUBJECT_UPDATE", entityType: "Subject", entityId: subject.id, metadata: { name } }, tx);
    return subject;
  });
}
