import Link from "next/link";
import { redirect } from "next/navigation";
import { Upload } from "lucide-react";
import { auth } from "@/lib/auth";
import { canManageStudents, roleHome } from "@/lib/rbac";
import { PageHeader } from "@/components/shared/page-header";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StudentsFilterBar } from "@/components/shared/students-filter-bar";
import { CreateUserDialog } from "@/components/admin/create-user-dialog";
import { listUsers } from "@/server/services/usersService";
import { listGroups } from "@/server/services/groupsService";
import type { UserStatus } from "@/generated/prisma/enums";

const STATUS_VARIANT: Record<UserStatus, "success" | "destructive" | "secondary"> = {
  ACTIVE: "success",
  BLOCKED: "destructive",
  ARCHIVED: "secondary",
};
const STATUS_LABEL: Record<UserStatus, string> = { ACTIVE: "Активен", BLOCKED: "Заблокирован", ARCHIVED: "Архив" };

export default async function TeacherStudentsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; groupId?: string; search?: string; page?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!canManageStudents(session.user.role)) redirect(roleHome(session.user.role));

  const sp = await searchParams;
  const page = Number(sp.page ?? "1") || 1;
  const [groups, result] = await Promise.all([
    listGroups(),
    listUsers(
      {
        role: "STUDENT",
        status: (sp.status as UserStatus) || undefined,
        groupId: sp.groupId || undefined,
        search: sp.search || undefined,
      },
      page
    ),
  ]);

  const totalPages = Math.max(1, Math.ceil(result.total / result.pageSize));

  return (
    <div>
      <PageHeader
        title="Студенты"
        description={`Всего: ${result.total}`}
        actions={
          <>
            <Link href="/teacher/students/import" className={cn(buttonVariants({ variant: "outline" }))}>
              <Upload className="h-4 w-4" />
              Импорт из Excel
            </Link>
            <CreateUserDialog groups={groups.map((g) => ({ id: g.id, name: g.name }))} studentOnly />
          </>
        }
      />

      <StudentsFilterBar groups={groups.map((g) => ({ id: g.id, name: g.name }))} />

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ФИО</TableHead>
            <TableHead>Логин</TableHead>
            <TableHead>Группа</TableHead>
            <TableHead>Статус</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {result.users.length === 0 && (
            <TableRow>
              <TableCell colSpan={4} className="text-center text-muted-foreground">
                Студенты не найдены
              </TableCell>
            </TableRow>
          )}
          {result.users.map((user) => (
            <TableRow key={user.id}>
              <TableCell className="font-medium">
                {user.lastName} {user.firstName} {user.middleName ?? ""}
              </TableCell>
              <TableCell>{user.login}</TableCell>
              <TableCell>{user.group?.name ?? "—"}</TableCell>
              <TableCell>
                <Badge variant={STATUS_VARIANT[user.status]}>{STATUS_LABEL[user.status]}</Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={{ pathname: "/teacher/students", query: { ...sp, page: p } }}
              className={cn(buttonVariants({ variant: p === page ? "default" : "outline", size: "sm" }))}
            >
              {p}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
