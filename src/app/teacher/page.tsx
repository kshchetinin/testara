import { ClipboardList, Users, CheckCircle2, TrendingUp } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { auth } from "@/lib/auth";
import { canManageTests } from "@/lib/rbac";
import { getTeacherDashboardStats } from "@/server/services/dashboardService";

export default async function TeacherDashboardPage() {
  const session = await auth();
  const isManager = canManageTests(session!.user.role);
  const stats = await getTeacherDashboardStats(session!.user.id, isManager);

  return (
    <div>
      <PageHeader title="Дашборд преподавателя" description="Текущие тестирования и последние результаты" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Активных тестирований" value={stats.activeAssignments} icon={ClipboardList} />
        <StatCard label="Студентов в системе" value={stats.studentCount} icon={Users} />
        <StatCard label="Завершили сегодня" value={stats.completedToday} icon={CheckCircle2} />
        <StatCard label="Средний результат" value={stats.avgPercentage !== null ? `${stats.avgPercentage}%` : "—"} icon={TrendingUp} />
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Последние результаты</CardTitle>
        </CardHeader>
        <CardContent>
          {stats.recentAttempts.length === 0 ? (
            <p className="text-sm text-muted-foreground">Пока нет завершённых попыток.</p>
          ) : (
            <ul className="divide-y divide-border">
              {stats.recentAttempts.map((attempt) => (
                <li key={attempt.id} className="flex items-center justify-between py-3 text-sm">
                  <div>
                    <span className="font-medium">
                      {attempt.student.lastName} {attempt.student.firstName}
                    </span>
                    <span className="text-muted-foreground">
                      {" "}
                      · {attempt.student.group?.name ?? "без группы"} · {attempt.assignment.testVersion.test.title}
                    </span>
                  </div>
                  <Badge variant={(attempt.percentage ?? 0) >= 60 ? "success" : "destructive"}>{attempt.percentage}%</Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
