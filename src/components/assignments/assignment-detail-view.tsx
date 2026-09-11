import { notFound } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
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

  return (
    <div>
      <PageHeader
        title={assignment.title || assignment.testVersion.test.title}
        description={`${assignment.testVersion.test.title} · версия ${assignment.testVersion.versionNumber}`}
        actions={
          <>
            <AssignmentStatusToggle id={assignment.id} status={assignment.status} />
            {canDelete && <AssignmentDeleteButton id={assignment.id} basePath={basePath} />}
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
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

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Студенты</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ФИО</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead>Результат</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground">
                    В выбранных группах нет студентов
                  </TableCell>
                </TableRow>
              )}
              {students.map((student) => {
                const attempt = attemptByStudent.get(student.id);
                return (
                  <TableRow key={student.id}>
                    <TableCell className="font-medium">
                      {student.lastName} {student.firstName}
                    </TableCell>
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
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {answeredAnalytics.length > 0 && (
        <Card className="mt-6">
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
