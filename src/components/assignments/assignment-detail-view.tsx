import { notFound } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { PrintButton } from "@/components/shared/print-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AssignmentStatusToggle } from "./assignment-status-toggle";
import { AssignmentDeleteButton } from "./assignment-delete-button";
import { getAssignmentDetail } from "@/server/services/assignmentsService";
import { getQuestionAnalytics } from "@/server/services/resultsService";
import { auth } from "@/lib/auth";

const SETTING_LABELS: Record<string, (a: NonNullable<Awaited<ReturnType<typeof getAssignmentDetail>>>) => string> = {
  window: (a) =>
    `${a.availableFrom ? new Date(a.availableFrom).toLocaleString("ru-RU") : "сразу"} — ${
      a.availableUntil ? new Date(a.availableUntil).toLocaleString("ru-RU") : "бессрочно"
    }`,
  timeLimit: (a) => (a.timeLimitMinutes ? `${a.timeLimitMinutes} мин` : "без ограничения"),
  attempts: (a) => `${a.attemptsAllowed}`,
};

export async function AssignmentDetailView({ assignmentId, basePath }: { assignmentId: string; basePath: string }) {
  const assignment = await getAssignmentDetail(assignmentId);
  if (!assignment) notFound();

  const session = await auth();
  const canDelete = assignment.attempts.length === 0 && (session!.user.role === "ADMIN" || assignment.createdById === session!.user.id);

  const attemptByStudent = new Map(assignment.attempts.filter((a) => a.status !== "ABANDONED").map((a) => [a.studentId, a]));
  const studentsById = new Map(
    [...assignment.groups.flatMap((g) => g.group.students), ...assignment.students.map((s) => s.student)].map((s) => [s.id, s])
  );
  const students = [...studentsById.values()];
  const totalQuestions = assignment.testVersion.questions.length;
  const analytics = await getQuestionAnalytics(assignment.testVersionId);
  const answeredAnalytics = analytics.filter((a) => a.totalAnswered > 0);

  const groupNames = assignment.groups.map((g) => g.group.name);
  const groupNameByStudentId = new Map<string, string>();
  assignment.groups.forEach((g) => g.group.students.forEach((s) => groupNameByStudentId.set(s.id, g.group.name)));
  assignment.students.forEach((s) => {
    if (!groupNameByStudentId.has(s.student.id)) groupNameByStudentId.set(s.student.id, "Индивидуально");
  });
  const showGroupColumn = groupNames.length > 1 || (groupNames.length >= 1 && assignment.students.length > 0);

  const completedAttempts = assignment.attempts.filter((a) => a.status === "COMPLETED");
  const averagePercentage =
    completedAttempts.length > 0
      ? Math.round((completedAttempts.reduce((sum, a) => sum + (a.percentage ?? 0), 0) / completedAttempts.length) * 10) / 10
      : null;

  return (
    <div>
      <div className="no-print">
        <PageHeader
          title={assignment.title || assignment.testVersion.test.title}
          description={`${assignment.testVersion.test.title} · версия ${assignment.testVersion.versionNumber}`}
          actions={
            <>
              <PrintButton />
              <AssignmentStatusToggle id={assignment.id} status={assignment.status} />
              {canDelete && <AssignmentDeleteButton id={assignment.id} basePath={basePath} />}
            </>
          }
        />
      </div>

      <div className="mb-6 hidden print:block">
        <h1 className="text-xl font-bold">{assignment.title || assignment.testVersion.test.title}</h1>
        <p className="mt-1 text-sm">
          Группа: {groupNames.join(", ") || "—"}
          {assignment.students.length > 0 ? ` · индивидуально: ${assignment.students.length}` : ""}
        </p>
        <p className="text-sm">
          Тест: {assignment.testVersion.test.title} · версия {assignment.testVersion.versionNumber}
        </p>
        <p className="text-sm">Период тестирования: {SETTING_LABELS.window(assignment)}</p>
        <p className="text-sm text-muted-foreground">Дата печати: {new Date().toLocaleDateString("ru-RU")}</p>
        {averagePercentage !== null && <p className="mt-2 text-base font-semibold">Средний результат по группе: {averagePercentage}%</p>}
      </div>

      <div className="no-print grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Доступность</p>
            <p className="text-sm font-medium">{SETTING_LABELS.window(assignment)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Время на тест</p>
            <p className="text-sm font-medium">{SETTING_LABELS.timeLimit(assignment)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Попыток разрешено</p>
            <p className="text-sm font-medium">{SETTING_LABELS.attempts(assignment)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Вопросов в попытке</p>
            <p className="text-sm font-medium">
              {assignment.questionCount ?? totalQuestions} из {totalQuestions}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Кому назначено</p>
            <p className="text-sm font-medium">
              {[
                ...assignment.groups.map((g) => g.group.name),
                ...(assignment.students.length > 0 ? [`+${assignment.students.length} студ.`] : []),
              ].join(", ") || "—"}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="print-card mt-6 print:mt-0">
        <CardHeader className="no-print">
          <CardTitle>Студенты</CardTitle>
        </CardHeader>
        <CardContent className="print:p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ФИО</TableHead>
                {showGroupColumn && <TableHead>Группа</TableHead>}
                <TableHead>Статус</TableHead>
                <TableHead>Результат</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.length === 0 && (
                <TableRow>
                  <TableCell colSpan={showGroupColumn ? 4 : 3} className="text-center text-muted-foreground">
                    В выбранных группах нет студентов
                  </TableCell>
                </TableRow>
              )}
              {[...students]
                .sort((a, b) => a.lastName.localeCompare(b.lastName, "ru") || a.firstName.localeCompare(b.firstName, "ru"))
                .map((student) => {
                  const attempt = attemptByStudent.get(student.id);
                  return (
                    <TableRow key={student.id}>
                      <TableCell className="font-medium">
                        {student.lastName} {student.firstName}
                      </TableCell>
                      {showGroupColumn && <TableCell>{groupNameByStudentId.get(student.id) ?? "—"}</TableCell>}
                      <TableCell>
                        {!attempt && <Badge variant="outline">Не начато</Badge>}
                        {attempt?.status === "IN_PROGRESS" && <Badge variant="secondary">В процессе</Badge>}
                        {attempt?.status === "COMPLETED" && <Badge variant="success">Завершено</Badge>}
                        {attempt?.status === "EXPIRED" && <Badge variant="destructive">Истекло время</Badge>}
                      </TableCell>
                      <TableCell>
                        {attempt?.status === "COMPLETED" ? `${attempt.score}/${attempt.maxScore} (${attempt.percentage}%)` : "—"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              {averagePercentage !== null && students.length > 0 && (
                <TableRow className="bg-muted font-semibold">
                  <TableCell colSpan={showGroupColumn ? 3 : 2}>Средний результат по группе</TableCell>
                  <TableCell>{averagePercentage}%</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {answeredAnalytics.length > 0 && (
        <Card className="no-print mt-6">
          <CardHeader>
            <CardTitle>Аналитика по вопросам</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Вопрос</TableHead>
                  <TableHead>Отвечали</TableHead>
                  <TableHead>Правильно</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {answeredAnalytics.map((q) => (
                  <TableRow key={q.questionId}>
                    <TableCell className="max-w-md">{q.text}</TableCell>
                    <TableCell>{q.totalAnswered}</TableCell>
                    <TableCell>{q.correctPercentage}%</TableCell>
                    <TableCell>{q.correctPercentage < 50 && <Badge variant="destructive">Сложный вопрос</Badge>}</TableCell>
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
