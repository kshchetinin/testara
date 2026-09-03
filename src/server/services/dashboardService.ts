import { prisma } from "@/lib/prisma";

export async function getAdminDashboardStats() {
  const [studentCount, teacherCount, groupCount, testCount, activeAssignmentCount, recentAudit] = await Promise.all([
    prisma.user.count({ where: { role: "STUDENT", status: { not: "ARCHIVED" } } }),
    prisma.user.count({ where: { role: { in: ["TEACHER", "METHODIST"] }, status: { not: "ARCHIVED" } } }),
    prisma.group.count({ where: { status: "ACTIVE" } }),
    prisma.test.count({ where: { status: "ACTIVE" } }),
    prisma.testAssignment.count({ where: { status: "ACTIVE" } }),
    prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { user: { select: { firstName: true, lastName: true } } },
    }),
  ]);

  return { studentCount, teacherCount, groupCount, testCount, activeAssignmentCount, recentAudit };
}

export async function getTeacherDashboardStats(userId: string, isManager: boolean) {
  const assignmentFilter = isManager ? {} : { createdById: userId };

  const [activeAssignments, studentCount, completedToday, recentAttempts] = await Promise.all([
    prisma.testAssignment.count({ where: { status: "ACTIVE", ...assignmentFilter } }),
    prisma.user.count({ where: { role: "STUDENT", status: "ACTIVE" } }),
    prisma.attempt.count({
      where: {
        status: "COMPLETED",
        completedAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        assignment: assignmentFilter,
      },
    }),
    prisma.attempt.findMany({
      where: { status: "COMPLETED", assignment: assignmentFilter },
      orderBy: { completedAt: "desc" },
      take: 8,
      include: {
        student: { select: { firstName: true, lastName: true, group: { select: { name: true } } } },
        assignment: { include: { testVersion: { include: { test: true } } } },
      },
    }),
  ]);

  const avgPercentage = recentAttempts.length
    ? Math.round(
        (recentAttempts.reduce((sum, a) => sum + (a.percentage ?? 0), 0) / recentAttempts.length) * 10
      ) / 10
    : null;

  return { activeAssignments, studentCount, completedToday, recentAttempts, avgPercentage };
}
