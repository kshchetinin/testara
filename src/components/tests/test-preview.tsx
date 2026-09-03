import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { QuestionDraft } from "./types";

export function TestPreview({ title, questions }: { title: string; questions: QuestionDraft[] }) {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <h2 className="text-xl font-semibold">{title || "Без названия"}</h2>
      {questions.length === 0 && <p className="text-sm text-muted-foreground">В тесте пока нет вопросов.</p>}
      {questions.map((q, i) => (
        <Card key={q.id}>
          <CardContent className="flex flex-col gap-3 p-5">
            <div className="flex items-start justify-between gap-2">
              <p className="font-medium">
                {i + 1}. {q.text || "Без текста"}
              </p>
              <Badge variant="outline">{q.points} балл(ов)</Badge>
            </div>
            {q.type === "TEXT_ANSWER" ? (
              <input disabled placeholder="Ответ студента…" className="rounded-md border border-input bg-muted px-3 py-2 text-sm" />
            ) : (
              <div className="flex flex-col gap-2">
                {q.answers.map((a) => (
                  <label key={a.id} className="flex items-center gap-2 text-sm">
                    <input type={q.type === "MULTIPLE_CHOICE" ? "checkbox" : "radio"} disabled />
                    {a.text || "—"}
                  </label>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
