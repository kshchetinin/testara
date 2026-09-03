import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, ChevronRight, CheckCircle2, XCircle, MinusCircle } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getAttemptDetail, getAdjacentAttemptIds } from "@/server/services/resultsService";
import { PrintButton } from "@/components/shared/print-button";

export async function AttemptDetailView({ attemptId, basePath }: { attemptId: string; basePath: string }) {
  const detail = await getAttemptDetail(attemptId);
  if (!detail) notFound();

  const { attempt, questions } = detail;
  const { prevId, nextId } = await getAdjacentAttemptIds(attempt.assignmentId, attemptId);

  return (
    <div>
      <PageHeader
        title={`${attempt.student.lastName} ${attempt.student.firstName} ${attempt.student.middleName ?? ""}`}
        description={`${attempt.assignment.testVersion.test.title} · версия ${attempt.assignment.testVersion.versionNumber} · группа ${attempt.student.group?.name ?? "—"}`}
        actions={
          <div className="no-print flex gap-2">
            <PrintButton />
            <Link
              href={prevId ? `${basePath}/attempt/${prevId}` : "#"}
              aria-disabled={!prevId}
              className={cn(buttonVariants({ variant: "outline" }), !prevId && "pointer-events-none opacity-50")}
            >
              <ChevronLeft className="h-4 w-4" />
              Пред. студент
            </Link>
            <Link
              href={nextId ? `${basePath}/attempt/${nextId}` : "#"}
              aria-disabled={!nextId}
              className={cn(buttonVariants({ variant: "outline" }), !nextId && "pointer-events-none opacity-50")}
            >
              След. студент
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        }
      />

      <Card className="mb-6">
        <CardContent className="flex flex-wrap items-center justify-between gap-4 p-6">
          <div>
            <p className="text-3xl font-semibold">{attempt.percentage}%</p>
            <p className="text-sm text-muted-foreground">
              {attempt.score} из {attempt.maxScore} баллов · попытка {attempt.attemptNumber}
            </p>
          </div>
          <div className="text-sm text-muted-foreground">
            {attempt.completedAt && <p>Завершено: {new Date(attempt.completedAt).toLocaleString("ru-RU")}</p>}
            {attempt.durationSeconds !== null && (
              <p>
                Время: {Math.floor(attempt.durationSeconds / 60)} мин {attempt.durationSeconds % 60} сек
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3">
        {questions.map((q, i) => (
          <Card key={q.id}>
            <CardContent className="flex flex-col gap-2 p-5">
              <div className="flex items-start justify-between gap-2">
                <p className="font-medium">
                  {i + 1}. {q.text}
                </p>
                {!q.answered ? (
                  <Badge variant="outline">
                    <MinusCircle className="h-3.5 w-3.5" /> Пропущен
                  </Badge>
                ) : q.isCorrect ? (
                  <Badge variant="success">
                    <CheckCircle2 className="h-3.5 w-3.5" /> {q.pointsAwarded}/{q.points}
                  </Badge>
                ) : (
                  <Badge variant="destructive">
                    <XCircle className="h-3.5 w-3.5" /> {q.pointsAwarded}/{q.points}
                  </Badge>
                )}
              </div>
              {q.type === "TEXT_ANSWER" ? (
                <p className="text-sm text-muted-foreground">
                  Ответ студента: {q.textAnswer || "—"}
                  {!q.isCorrect && <> · Допустимые варианты: {q.correctTextAnswers.join(", ")}</>}
                </p>
              ) : (
                <ul className="text-sm">
                  {q.answers.map((a) => (
                    <li
                      key={a.id}
                      className={a.isCorrect ? "text-success" : q.selectedAnswerIds.includes(a.id) ? "text-destructive" : "text-muted-foreground"}
                    >
                      {q.selectedAnswerIds.includes(a.id) ? "☑" : "☐"} {a.text}
                      {a.isCorrect ? " (правильный ответ)" : ""}
                    </li>
                  ))}
                </ul>
              )}
              {q.explanation && <p className="text-xs italic text-muted-foreground">Пояснение: {q.explanation}</p>}
            </CardContent>
          </Card>
        ))}
      </div>

    </div>
  );
}
