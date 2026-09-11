import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CreateAssignmentDialog } from "./create-assignment-dialog";
import { AssignmentsFilterBar } from "./assignments-filter-bar";
import { listAssignments, listPublishableTests, listAssignmentTopics, type AssignmentFilters } from "@/server/services/assignmentsService";
import { listGroups } from "@/server/services/groupsService";
import { listActiveStudents } from "@/server/services/usersService";

export async function AssignmentsListView({ basePath, filters }: { basePath: string; filters: AssignmentFilters }) {
  const [assignments, tests, groups, students, topics] = await Promise.all([
    listAssignments(filters),
    listPublishableTests(filters.subjectIds),
    listGroups(),
    listActiveStudents(),
    listAssignmentTopics(),
  ]);

  return (
    <div>
      <PageHeader
        title="Назначения тестирования"
        description={`Найдено: ${assignments.length}`}
        actions={
          <CreateAssignmentDialog
            basePath={basePath}
            tests={tests.map((t) => ({ id: t.id, title: t.title, versions: t.versions.map((v) => ({ id: v.id, versionNumber: v.versionNumber, questionCount: v._count.questions })) }))}
            groups={groups.filter((g) => g.status === "ACTIVE").map((g) => ({ id: g.id, name: g.name }))}
            students={students.map((s) => ({
              id: s.id,
              name: `${s.lastName} ${s.firstName} ${s.middleName ?? ""}`.trim(),
              groupId: s.groupId,
              groupName: s.group?.name ?? null,
            }))}
          />
        }
      />

      <AssignmentsFilterBar groups={groups.filter((g) => g.status === "ACTIVE").map((g) => ({ id: g.id, name: g.name }))} topics={topics} />

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Тест</TableHead>
            <TableHead>Кому назначено</TableHead>
            <TableHead>Автор</TableHead>
            <TableHead>Попыток</TableHead>
            <TableHead>Доступно до</TableHead>
            <TableHead>Статус</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {assignments.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground">
                Назначений не найдено
              </TableCell>
            </TableRow>
          )}
          {assignments.map((a) => {
            const targets = [...a.groups.map((g) => g.group.name), ...a.students.map((s) => `${s.student.lastName} ${s.student.firstName}`)];
            return (
              <TableRow key={a.id}>
                <TableCell className="font-medium">
                  <Link href={`${basePath}/${a.id}`} className="hover:underline">
                    {a.title || a.testVersion.test.title}
                  </Link>
                </TableCell>
                <TableCell className="max-w-xs truncate">{targets.join(", ") || "—"}</TableCell>
                <TableCell>
                  {a.createdBy.lastName} {a.createdBy.firstName}
                </TableCell>
                <TableCell>{a._count.attempts}</TableCell>
                <TableCell>{a.availableUntil ? new Date(a.availableUntil).toLocaleDateString("ru-RU") : "—"}</TableCell>
                <TableCell>
                  <Badge variant={a.status === "ACTIVE" ? "success" : "secondary"}>{a.status === "ACTIVE" ? "Активно" : "Закрыто"}</Badge>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
