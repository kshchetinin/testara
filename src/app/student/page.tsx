import Link from "next/link";
import { Clock, FileText, PlayCircle, CheckCircle2 } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { listStudentAssignments } from "@/server/services/attemptsService";

export default async function StudentDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await auth();
  const [user, assignments, sp] = await Promise.all([
    prisma.user.findUnique({ where: { id: session!.user.id }, include: { group: true } }),
    listStudentAssignments(session!.user.id),
    searchParams,
  ]);

  return (
    <div>
      <PageHeader
        title={`${user?.lastName} ${user?.firstName} ${user?.middleName ?? ""}`}
        description={`Группа: ${user?.group?.name ?? "не назначена"}`}
      />

      {sp.error && (
        <div className="mb-4 rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">{sp.error}</div>
      )}

      <div className="flex flex-col gap-4">
        {assignments.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">Вам пока не назначено ни одного тестирования.</CardContent>
          </Card>
        )}

        {assignments.map((a) => (
          <Card key={a.id}>
            <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <p className="font-medium">{a.title}</p>
                </div>
                <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span>{a.questionCount} вопросов</span>
                  {a.timeLimitMinutes && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {a.timeLimitMinutes} мин
                    </span>
                  )}
                  <span>
                    Попыток: {a.attemptsUsed} / {a.attemptsAllowed}
                  </span>
                  {a.availableUntil && <span>Доступно до {new Date(a.availableUntil).toLocaleString("ru-RU")}</span>}
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                {a.lastResult && (
                  <Badge variant={(a.lastResult.percentage ?? 0) >= 60 ? "success" : "destructive"}>{a.lastResult.percentage}%</Badge>
                )}
                {a.inProgressAttemptId ? (
                  <Link href={`/student/attempt/${a.inProgressAttemptId}`} className={cn(buttonVariants({ variant: "default" }))}>
                    <PlayCircle className="h-4 w-4" />
                    Продолжить
                  </Link>
                ) : a.canStart ? (
                  <Link href={`/student/test/${a.id}`} className={cn(buttonVariants({ variant: "default" }))}>
                    <PlayCircle className="h-4 w-4" />
                    Начать
                  </Link>
                ) : a.lastCompletedAttemptId ? (
                  <Link href={`/student/result/${a.lastCompletedAttemptId}`} className={cn(buttonVariants({ variant: "outline" }))}>
                    <CheckCircle2 className="h-4 w-4" />
                    Результат
                  </Link>
                ) : (
                  <Badge variant="outline">Недоступно</Badge>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
