import Link from "next/link";
import { Upload } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { UsersFilterBar } from "@/components/admin/users-filter-bar";
import { CreateUserDialog } from "@/components/admin/create-user-dialog";
import { listUsers } from "@/server/services/usersService";
import { listGroups } from "@/server/services/groupsService";
import { roleLabel } from "@/lib/rbac";
import type { Role, UserStatus } from "@/generated/prisma/enums";

const STATUS_VARIANT: Record<UserStatus, "success" | "destructive" | "secondary"> = {
  ACTIVE: "success",
  BLOCKED: "destructive",
  ARCHIVED: "secondary",
};
const STATUS_LABEL: Record<UserStatus, string> = { ACTIVE: "Активен", BLOCKED: "Заблокирован", ARCHIVED: "Архив" };

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string; status?: string; groupId?: string; search?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const page = Number(sp.page ?? "1") || 1;
  const [groups, result] = await Promise.all([
    listGroups(),
    listUsers(
      {
        role: (sp.role as Role) || undefined,
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
        title="Пользователи"
        description={`Всего: ${result.total}`}
        actions={
          <>
            <Link href="/admin/users/import" className={cn(buttonVariants({ variant: "outline" }))}>
              <Upload className="h-4 w-4" />
              Импорт из Excel
            </Link>
            <CreateUserDialog groups={groups.map((g) => ({ id: g.id, name: g.name }))} />
          </>
        }
      />

      <UsersFilterBar groups={groups.map((g) => ({ id: g.id, name: g.name }))} />

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ФИО</TableHead>
            <TableHead>Логин</TableHead>
            <TableHead>Роль</TableHead>
            <TableHead>Группа</TableHead>
            <TableHead>Статус</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {result.users.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground">
                Пользователи не найдены
              </TableCell>
            </TableRow>
          )}
          {result.users.map((user) => (
            <TableRow key={user.id}>
              <TableCell className="font-medium">
                <Link href={`/admin/users/${user.id}`} className="hover:underline">
                  {user.lastName} {user.firstName} {user.middleName ?? ""}
                </Link>
              </TableCell>
              <TableCell>{user.login}</TableCell>
              <TableCell>{roleLabel(user.role)}</TableCell>
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
              href={{ pathname: "/admin/users", query: { ...sp, page: p } }}
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
