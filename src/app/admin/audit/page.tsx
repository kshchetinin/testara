import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select } from "@/components/ui/select";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { listAuditLogs, listDistinctAuditActions } from "@/server/services/auditService";

const ACTION_LABELS: Record<string, string> = {
  USER_CREATE: "Создан пользователь",
  USER_UPDATE: "Изменён пользователь",
  USER_STATUS_CHANGE: "Изменён статус пользователя",
  USER_PASSWORD_RESET: "Сброшен пароль",
  USER_IMPORT: "Импорт студентов",
  GROUP_CREATE: "Создана группа",
  GROUP_UPDATE: "Изменена группа",
  TEST_CREATE: "Создан тест",
  TEST_UPDATE: "Изменён тест",
  TEST_IMPORT: "Импорт теста",
  TEST_QUESTIONS_UPDATE: "Изменены вопросы теста",
  TEST_PUBLISH: "Опубликован тест",
  TEST_VERSION_CREATE: "Создана новая версия теста",
  ASSIGNMENT_CREATE: "Назначено тестирование",
  ASSIGNMENT_UPDATE: "Изменено назначение",
  ATTEMPT_SUBMIT: "Завершена попытка тестирования",
};

export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams: Promise<{ action?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const page = Number(sp.page ?? "1") || 1;
  const [{ logs, total, pageSize }, actions] = await Promise.all([
    listAuditLogs({ action: sp.action || undefined }, page),
    listDistinctAuditActions(),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div>
      <PageHeader title="Журнал аудита" description={`Всего записей: ${total}`} />

      <form method="GET" className="mb-4 flex items-center gap-3">
        <Select name="action" defaultValue={sp.action ?? ""} className="w-auto min-w-56">
          <option value="">Все действия</option>
          {actions.map((a) => (
            <option key={a} value={a}>
              {ACTION_LABELS[a] ?? a}
            </option>
          ))}
        </Select>
        <button type="submit" className={cn(buttonVariants({ variant: "outline" }))}>
          Применить
        </button>
      </form>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Действие</TableHead>
            <TableHead>Пользователь</TableHead>
            <TableHead>Объект</TableHead>
            <TableHead>Дата</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {logs.length === 0 && (
            <TableRow>
              <TableCell colSpan={4} className="text-center text-muted-foreground">
                Записей не найдено
              </TableCell>
            </TableRow>
          )}
          {logs.map((log) => (
            <TableRow key={log.id}>
              <TableCell className="font-medium">{ACTION_LABELS[log.action] ?? log.action}</TableCell>
              <TableCell>{log.user ? `${log.user.lastName} ${log.user.firstName} (${log.user.login})` : "—"}</TableCell>
              <TableCell className="text-xs text-muted-foreground">{log.entityType}</TableCell>
              <TableCell>{new Date(log.createdAt).toLocaleString("ru-RU")}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={{ pathname: "/admin/audit", query: { ...sp, page: p } }}
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
