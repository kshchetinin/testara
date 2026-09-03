import { prisma } from "@/lib/prisma";
import { logAudit } from "./auditService";

export async function listGroups() {
  const groups = await prisma.group.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { students: true } } },
  });
  return groups;
}

export async function createGroup(name: string, actorId: string) {
  return prisma.$transaction(async (tx) => {
    const group = await tx.group.create({ data: { name } });
    await logAudit({ userId: actorId, action: "GROUP_CREATE", entityType: "Group", entityId: group.id, metadata: { name } }, tx);
    return group;
  });
}

export async function renameGroup(id: string, name: string, actorId: string) {
  return prisma.$transaction(async (tx) => {
    const group = await tx.group.update({ where: { id }, data: { name } });
    await logAudit({ userId: actorId, action: "GROUP_UPDATE", entityType: "Group", entityId: group.id, metadata: { name } }, tx);
    return group;
  });
}

export async function setGroupStatus(id: string, status: "ACTIVE" | "ARCHIVED", actorId: string) {
  return prisma.$transaction(async (tx) => {
    const group = await tx.group.update({ where: { id }, data: { status } });
    await logAudit({ userId: actorId, action: "GROUP_UPDATE", entityType: "Group", entityId: group.id, metadata: { status } }, tx);
    return group;
  });
}

export async function getGroupWithStats(id: string) {
  const group = await prisma.group.findUnique({
    where: { id },
    include: {
      students: {
        orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      },
    },
  });
  if (!group) return null;

  const attempts = await prisma.attempt.findMany({
    where: { student: { groupId: id }, status: "COMPLETED" },
    select: { percentage: true, studentId: true },
  });

  const percentages = attempts.map((a) => a.percentage ?? 0);
  const average = percentages.length ? percentages.reduce((a, b) => a + b, 0) / percentages.length : null;
  const sorted = [...percentages].sort((a, b) => a - b);
  const median = sorted.length
    ? sorted.length % 2 === 1
      ? sorted[(sorted.length - 1) / 2]
      : (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
    : null;

  const completedStudentIds = new Set(attempts.map((a) => a.studentId));

  return {
    group,
    stats: {
      average: average !== null ? Math.round(average * 10) / 10 : null,
      median: median !== null ? Math.round(median * 10) / 10 : null,
      min: percentages.length ? Math.min(...percentages) : null,
      max: percentages.length ? Math.max(...percentages) : null,
      completedCount: completedStudentIds.size,
      totalStudents: group.students.length,
    },
  };
}
