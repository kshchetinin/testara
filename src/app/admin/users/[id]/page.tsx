import { notFound } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { UserDetailPanel } from "@/components/admin/user-detail-panel";
import { getUserDetail } from "@/server/services/usersService";
import { listGroups } from "@/server/services/groupsService";

const ATTEMPT_STATUS_LABEL: Record<string, string> = {
  IN_PROGRESS: "В процессе",
  COMPLETED: "Завершена",
  EXPIRED: "Истекло время",
  ABANDONED: "Не завершена",
};

export default async function AdminUserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [result, groups] = await Promise.all([getUserDetail(id), listGroups()]);
  if (!result) notFound();

  const { user, attempts } = result;
  const fullName = `${user.lastName} ${user.firstName} ${user.middleName ?? ""}`.trim();

  return (
    <div>
      <PageHeader title={fullName} description={`Логин: ${user.login}`} />

      <UserDetailPanel
        user={user}
        groups={groups.filter((g) => g.status === "ACTIVE").map((g) => ({ id: g.id, name: g.name }))}
      />

      {user.role === "STUDENT" && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>История тестирований</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Тест</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead>Результат</TableHead>
                  <TableHead>Дата</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {attempts.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      Попыток пока нет
                    </TableCell>
                  </TableRow>
                )}
                {attempts.map((attempt) => (
                  <TableRow key={attempt.id}>
                    <TableCell className="font-medium">{attempt.assignment.testVersion.test.title}</TableCell>
                    <TableCell>{ATTEMPT_STATUS_LABEL[attempt.status]}</TableCell>
                    <TableCell>
                      {attempt.status === "COMPLETED" ? (
                        <Badge variant={((attempt.percentage ?? 0) >= 60 ? "success" : "destructive")}>
                          {attempt.score}/{attempt.maxScore} ({attempt.percentage}%)
                        </Badge>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>{new Date(attempt.startedAt).toLocaleString("ru-RU")}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
