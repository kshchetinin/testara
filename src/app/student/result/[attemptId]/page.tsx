import { notFound } from "next/navigation";
import { CheckCircle2, XCircle, MinusCircle } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { auth } from "@/lib/auth";
import { getAttemptResult } from "@/server/services/attemptsService";

export default async function StudentResultPage({ params }: { params: Promise<{ attemptId: string }> }) {
  const { attemptId } = await params;
  const session = await auth();
  const result = await getAttemptResult(attemptId, session!.user.id);
  if (!result) notFound();

  if (result.status !== "COMPLETED") {
    return (
      <div>
        <PageHeader title="Попытка ещё не завершена" />
      </div>
    );
  }

  if (!result.showResult) {
    return (
      <div>
        <PageHeader title="Тест завершён" description="Преподаватель не разрешил показ результата по этому тестированию." />
      </div>
    );
  }

  return (
    <div>
      <PageHeader title={result.testTitle} description="Результат тестирования" />

      <Card className="mb-6">
        <CardContent className="flex flex-col items-center gap-2 p-8 text-center">
          <p className="text-4xl font-semibold">{result.percentage}%</p>
          <p className="text-muted-foreground">
            {result.score} из {result.maxScore} баллов
          </p>
          {result.durationSeconds !== null && (
            <p className="text-xs text-muted-foreground">
              Время прохождения: {Math.floor(result.durationSeconds / 60)} мин {result.durationSeconds % 60} сек
            </p>
          )}
        </CardContent>
      </Card>

      {result.showCorrectAnswers && result.questions.length > 0 && (
        <div className="flex flex-col gap-3">
          {result.questions.map((q, i) => (
            <Card key={q.id}>
              <CardContent className="flex flex-col gap-2 p-5">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium">
                    {i + 1}. {q.text}
                  </p>
                  {q.selectedAnswerIds.length === 0 && !q.textAnswer ? (
                    <Badge variant="outline">
                      <MinusCircle className="h-3.5 w-3.5" /> Пропущен
                    </Badge>
                  ) : q.isCorrect ? (
                    <Badge variant="success">
                      <CheckCircle2 className="h-3.5 w-3.5" /> {q.pointsAwarded} б.
                    </Badge>
                  ) : (
                    <Badge variant="destructive">
                      <XCircle className="h-3.5 w-3.5" /> {q.pointsAwarded} б.
                    </Badge>
                  )}
                </div>
                {q.type === "TEXT_ANSWER" ? (
                  <p className="text-sm text-muted-foreground">
                    Ваш ответ: {q.textAnswer || "—"}
                    {!q.isCorrect && q.correctTextAnswers && <> · Верно: {q.correctTextAnswers.join(", ")}</>}
                  </p>
                ) : (
                  <ul className="text-sm">
                    {q.answers.map((a) => (
                      <li
                        key={a.id}
                        className={
                          a.isCorrect
                            ? "text-success"
                            : q.selectedAnswerIds.includes(a.id)
                              ? "text-destructive"
                              : "text-muted-foreground"
                        }
                      >
                        {q.selectedAnswerIds.includes(a.id) ? "☑" : "☐"} {a.text}
                        {a.isCorrect ? " (правильно)" : ""}
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
