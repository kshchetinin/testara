"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Clock, ChevronLeft, ChevronRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

interface QuestionView {
  id: string;
  type: "SINGLE_CHOICE" | "MULTIPLE_CHOICE" | "TRUE_FALSE" | "TEXT_ANSWER";
  text: string;
  points: number;
  answers: { id: string; text: string }[];
  savedAnswer: { selectedAnswerIds: string[]; textAnswer: string | null } | null;
}

interface AttemptData {
  id: string;
  status: string;
  deadline: string | null;
  testTitle: string;
  questions: QuestionView[];
}

interface LocalAnswer {
  selectedAnswerIds: string[];
  textAnswer: string;
}

const AUTOSAVE_INTERVAL_MS = 20000;

export function AttemptRunner({ attempt }: { attempt: AttemptData }) {
  const router = useRouter();
  const { toast } = useToast();
  const [index, setIndex] = React.useState(0);
  const [answers, setAnswers] = React.useState<Record<string, LocalAnswer>>(() => {
    const initial: Record<string, LocalAnswer> = {};
    for (const q of attempt.questions) {
      initial[q.id] = {
        selectedAnswerIds: q.savedAnswer?.selectedAnswerIds ?? [],
        textAnswer: q.savedAnswer?.textAnswer ?? "",
      };
    }
    return initial;
  });
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const deadlineMs = attempt.deadline ? new Date(attempt.deadline).getTime() : null;
  // `now` is only ever set from an effect/interval, never read live during render,
  // so the countdown below stays a pure function of state.
  const [now, setNow] = React.useState<number | null>(null);
  const remainingSeconds = deadlineMs !== null && now !== null ? Math.max(0, Math.round((deadlineMs - now) / 1000)) : null;

  const saveTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const dirtyQuestionsRef = React.useRef<Set<string>>(new Set());
  const submittingRef = React.useRef(false);
  // Mirrors `answers` so debounced/delayed saves never read a stale closure —
  // setState from the same tick as a save trigger is not yet visible to
  // callbacks captured before the re-render. Updated from an effect below,
  // never during render.
  const answersRef = React.useRef(answers);
  React.useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  const question = attempt.questions[index];
  const answeredCount = attempt.questions.filter((q) => {
    const a = answers[q.id];
    return a && (a.selectedAnswerIds.length > 0 || a.textAnswer.trim().length > 0);
  }).length;

  const flushSave = React.useCallback(
    async (questionId: string) => {
      if (!dirtyQuestionsRef.current.has(questionId)) return;
      dirtyQuestionsRef.current.delete(questionId);
      const a = answersRef.current[questionId];
      if (!a) return;
      try {
        await fetch(`/api/attempts/${attempt.id}/answer`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ questionId, selectedAnswerIds: a.selectedAnswerIds, textAnswer: a.textAnswer }),
        });
      } catch {
        // best-effort — periodic autosave and navigation-triggered flushes will retry
      }
    },
    [attempt.id]
  );

  function updateAnswer(questionId: string, patch: Partial<LocalAnswer>) {
    setAnswers((prev) => ({ ...prev, [questionId]: { ...prev[questionId], ...patch } }));
    dirtyQuestionsRef.current.add(questionId);
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => flushSave(questionId), 800);
  }

  function goTo(nextIndex: number) {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    flushSave(question.id);
    setIndex(Math.max(0, Math.min(attempt.questions.length - 1, nextIndex)));
  }

  // periodic autosave safety net for whatever question is currently open
  React.useEffect(() => {
    const interval = setInterval(() => flushSave(question.id), AUTOSAVE_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [flushSave, question.id]);

  // flush on tab hide / navigation away
  React.useEffect(() => {
    const handler = () => flushSave(question.id);
    document.addEventListener("visibilitychange", handler);
    window.addEventListener("beforeunload", handler);
    return () => {
      document.removeEventListener("visibilitychange", handler);
      window.removeEventListener("beforeunload", handler);
    };
  }, [flushSave, question.id]);

  const doSubmit = React.useCallback(async () => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    await flushSave(question.id);
    try {
      const res = await fetch(`/api/attempts/${attempt.id}/submit`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      router.push(`/student/result/${attempt.id}`);
    } catch (err) {
      toast({ title: "Не удалось завершить тест", description: (err as Error).message, variant: "error" });
      submittingRef.current = false;
      setSubmitting(false);
    }
  }, [attempt.id, flushSave, question, router, toast]);

  // drives the countdown display by ticking `now`; `remainingSeconds` above is derived from it.
  // The initial tick is deferred a beat too, so this effect only ever schedules
  // async callbacks instead of calling setState synchronously in its own body.
  React.useEffect(() => {
    if (deadlineMs === null) return;
    const initial = setTimeout(() => setNow(Date.now()), 0);
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      clearTimeout(initial);
      clearInterval(interval);
    };
  }, [deadlineMs]);

  // auto-submit once time runs out; deferred a tick so this effect doesn't
  // synchronously cascade into doSubmit's own setState calls
  React.useEffect(() => {
    if (remainingSeconds !== 0) return;
    const timeout = setTimeout(() => doSubmit(), 0);
    return () => clearTimeout(timeout);
  }, [remainingSeconds, doSubmit]);

  const minutes = remainingSeconds !== null ? Math.floor(remainingSeconds / 60) : null;
  const seconds = remainingSeconds !== null ? remainingSeconds % 60 : null;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 pb-24">
      <div className="sticky top-0 z-10 -mx-4 border-b border-border bg-background/95 px-4 py-3 backdrop-blur sm:-mx-8 sm:px-8">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold">{attempt.testTitle}</p>
            <p className="text-xs text-muted-foreground">
              Вопрос {index + 1} из {attempt.questions.length}
            </p>
          </div>
          {remainingSeconds !== null && (
            <div className={cn("flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium", remainingSeconds < 60 ? "bg-destructive/10 text-destructive" : "bg-muted")}>
              <Clock className="h-4 w-4" />
              {minutes}:{String(seconds).padStart(2, "0")}
            </div>
          )}
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
        <p className="mb-4 text-lg font-medium">{question.text}</p>

        {question.type === "TEXT_ANSWER" ? (
          <Input
            value={answers[question.id]?.textAnswer ?? ""}
            onChange={(e) => updateAnswer(question.id, { textAnswer: e.target.value })}
            placeholder="Введите ответ"
          />
        ) : (
          <div className="flex flex-col gap-2">
            {question.answers.map((a) => {
              const current = answers[question.id];
              const checked = current?.selectedAnswerIds.includes(a.id) ?? false;
              return (
                <label
                  key={a.id}
                  className={cn(
                    "flex cursor-pointer items-center gap-3 rounded-md border px-4 py-3 text-sm transition-colors",
                    checked ? "border-primary bg-primary/5" : "border-border hover:bg-muted"
                  )}
                >
                  {question.type === "MULTIPLE_CHOICE" ? (
                    <Checkbox
                      checked={checked}
                      onChange={(e) => {
                        const set = new Set(current?.selectedAnswerIds ?? []);
                        if (e.target.checked) set.add(a.id);
                        else set.delete(a.id);
                        updateAnswer(question.id, { selectedAnswerIds: [...set] });
                      }}
                    />
                  ) : (
                    <input
                      type="radio"
                      name={question.id}
                      checked={checked}
                      onChange={() => updateAnswer(question.id, { selectedAnswerIds: [a.id] })}
                      className="h-4 w-4 accent-[var(--primary)]"
                    />
                  )}
                  {a.text}
                </label>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {attempt.questions.map((q, i) => {
          const a = answers[q.id];
          const isAnswered = a && (a.selectedAnswerIds.length > 0 || a.textAnswer.trim().length > 0);
          return (
            <button
              key={q.id}
              onClick={() => goTo(i)}
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-md border text-xs font-medium transition-colors",
                i === index
                  ? "border-primary bg-primary text-primary-foreground"
                  : isAnswered
                    ? "border-success/40 bg-success/10 text-success"
                    : "border-border text-muted-foreground hover:bg-muted"
              )}
            >
              {i + 1}
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={() => goTo(index - 1)} disabled={index === 0}>
          <ChevronLeft className="h-4 w-4" />
          Назад
        </Button>
        {index < attempt.questions.length - 1 ? (
          <Button onClick={() => goTo(index + 1)}>
            Далее
            <ChevronRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button onClick={() => setConfirmOpen(true)}>
            <CheckCircle2 className="h-4 w-4" />
            Завершить тест
          </Button>
        )}
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogHeader>
          <DialogTitle>Завершить тестирование?</DialogTitle>
          <DialogDescription>
            Отвечено на {answeredCount} из {attempt.questions.length} вопросов
            {answeredCount < attempt.questions.length && ` (${attempt.questions.length - answeredCount} без ответа)`}. После завершения
            изменить ответы будет нельзя.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setConfirmOpen(false)}>
            Продолжить тест
          </Button>
          <Button onClick={doSubmit} disabled={submitting}>
            {submitting ? "Завершение…" : "Завершить"}
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
