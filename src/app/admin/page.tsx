import { Users, UserCog, UsersRound, FileText, ClipboardList } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAdminDashboardStats } from "@/server/services/dashboardService";
import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";

const ACTION_LABELS: Record<string, string> = {
  USER_CREATE: "Создан пользователь",
  USER_UPDATE: "Изменён пользователь",
  USER_IMPORT: "Импорт студентов",
  GROUP_CREATE: "Создана группа",
  TEST_CREATE: "Создан тест",
  TEST_IMPORT: "Импорт теста",
  TEST_PUBLISH: "Опубликован тест",
  TEST_VERSION_CREATE: "Создана новая версия теста",
  ASSIGNMENT_CREATE: "Назначено тестирование",
};

export default async function AdminDashboardPage() {
  const stats = await getAdminDashboardStats();

  return (
    <div>
      <PageHeader title="Дашборд администратора" description="Общая сводка по системе" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Студентов" value={stats.studentCount} icon={Users} />
        <StatCard label="Преподавателей" value={stats.teacherCount} icon={UserCog} />
        <StatCard label="Групп" value={stats.groupCount} icon={UsersRound} />
        <StatCard label="Тестов" value={stats.testCount} icon={FileText} />
        <StatCard label="Активных тестирований" value={stats.activeAssignmentCount} icon={ClipboardList} />
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Последние действия</CardTitle>
        </CardHeader>
        <CardContent>
          {stats.recentAudit.length === 0 ? (
            <p className="text-sm text-muted-foreground">Пока нет записей в журнале аудита.</p>
          ) : (
            <ul className="divide-y divide-border">
              {stats.recentAudit.map((entry) => (
                <li key={entry.id} className="flex items-center justify-between py-3 text-sm">
                  <div>
                    <span className="font-medium">{ACTION_LABELS[entry.action] ?? entry.action}</span>
                    {entry.user && (
                      <span className="text-muted-foreground">
                        {" "}
                        — {entry.user.lastName} {entry.user.firstName}
                      </span>
                    )}
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {formatDistanceToNow(entry.createdAt, { addSuffix: true, locale: ru })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
