import { notFound } from "next/navigation";
import { Users, TrendingUp, BarChart3, CheckCircle2 } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { getGroupWithStats } from "@/server/services/groupsService";

export async function GroupDetailView({ groupId }: { groupId: string }) {
  const result = await getGroupWithStats(groupId);
  if (!result) notFound();

  const { group, stats } = result;

  return (
    <div>
      <PageHeader title={`Группа ${group.name}`} description="Студенты и статистика по группе" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Студентов" value={stats.totalStudents} icon={Users} />
        <StatCard label="Средний результат" value={stats.average !== null ? `${stats.average}%` : "—"} icon={TrendingUp} />
        <StatCard label="Медиана" value={stats.median !== null ? `${stats.median}%` : "—"} icon={BarChart3} />
        <StatCard label="Завершили тесты" value={`${stats.completedCount} / ${stats.totalStudents}`} icon={CheckCircle2} />
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Студенты</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ФИО</TableHead>
                <TableHead>Логин</TableHead>
                <TableHead>Статус</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {group.students.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground">
                    В группе пока нет студентов
                  </TableCell>
                </TableRow>
              )}
              {group.students.map((student) => (
                <TableRow key={student.id}>
                  <TableCell className="font-medium">
                    {student.lastName} {student.firstName} {student.middleName ?? ""}
                  </TableCell>
                  <TableCell>{student.login}</TableCell>
                  <TableCell>
                    <Badge variant={student.status === "ACTIVE" ? "success" : student.status === "BLOCKED" ? "destructive" : "secondary"}>
                      {student.status === "ACTIVE" ? "Активен" : student.status === "BLOCKED" ? "Заблокирован" : "Архив"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
