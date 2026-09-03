"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import { Plus, Save, Send, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { QuestionItem } from "./question-item";
import { TestPreview } from "./test-preview";
import { emptyQuestion, type QuestionDraft } from "./types";

interface InitialQuestion {
  id: string;
  type: QuestionDraft["type"];
  text: string;
  explanation: string | null;
  points: number;
  scoringMode: QuestionDraft["scoringMode"] | null;
  correctTextAnswers: string[];
  answers: { id: string; text: string; isCorrect: boolean }[];
}

function toDraft(q: InitialQuestion): QuestionDraft {
  return {
    id: q.id,
    type: q.type,
    text: q.text,
    explanation: q.explanation ?? "",
    points: q.points,
    scoringMode: q.scoringMode ?? "FULL_MATCH",
    correctTextAnswers: q.correctTextAnswers,
    answers: q.answers.map((a) => ({ id: a.id, text: a.text, isCorrect: a.isCorrect })),
  };
}

export function QuestionEditor({
  testId,
  versionId,
  testTitle,
  versionNumber,
  status,
  initialQuestions,
  backHref,
  readOnly: forcedReadOnly = false,
}: {
  testId: string;
  versionId: string;
  testTitle: string;
  versionNumber: number;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  initialQuestions: InitialQuestion[];
  backHref: string;
  readOnly?: boolean;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [questions, setQuestions] = React.useState<QuestionDraft[]>(initialQuestions.map(toDraft));
  const [saving, setSaving] = React.useState(false);
  const [publishing, setPublishing] = React.useState(false);
  const [preview, setPreview] = React.useState(false);
  const readOnly = forcedReadOnly || status !== "DRAFT";

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setQuestions((prev) => {
      const oldIndex = prev.findIndex((q) => q.id === active.id);
      const newIndex = prev.findIndex((q) => q.id === over.id);
      return arrayMove(prev, oldIndex, newIndex);
    });
  }

  function updateQuestion(id: string, next: QuestionDraft) {
    setQuestions((prev) => prev.map((q) => (q.id === id ? next : q)));
  }

  function removeQuestion(id: string) {
    setQuestions((prev) => prev.filter((q) => q.id !== id));
  }

  function addQuestion() {
    setQuestions((prev) => [...prev, emptyQuestion()]);
  }

  async function save(): Promise<boolean> {
    setSaving(true);
    try {
      const payload = {
        questions: questions.map((q) => ({
          type: q.type,
          text: q.text,
          explanation: q.explanation || undefined,
          points: q.points,
          scoringMode: q.type === "MULTIPLE_CHOICE" ? q.scoringMode : undefined,
          correctTextAnswers: q.type === "TEXT_ANSWER" ? q.correctTextAnswers.filter(Boolean) : undefined,
          answers: q.type === "TEXT_ANSWER" ? undefined : q.answers.map((a) => ({ text: a.text, isCorrect: a.isCorrect })),
        })),
      };
      const res = await fetch(`/api/tests/${testId}/versions/${versionId}/questions`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast({ title: "Изменения сохранены", variant: "success" });
      router.refresh();
      return true;
    } catch (err) {
      toast({ title: "Не удалось сохранить", description: (err as Error).message, variant: "error" });
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function publish() {
    setPublishing(true);
    try {
      const saved = await save();
      if (!saved) return;
      const res = await fetch(`/api/tests/${testId}/versions/${versionId}/publish`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast({ title: "Тест опубликован", variant: "success" });
      router.push(backHref);
      router.refresh();
    } catch (err) {
      toast({ title: "Не удалось опубликовать", description: (err as Error).message, variant: "error" });
    } finally {
      setPublishing(false);
    }
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{testTitle}</h1>
          <div className="mt-1 flex items-center gap-2">
            <Badge variant="outline">Версия {versionNumber}</Badge>
            <Badge variant={status === "DRAFT" ? "secondary" : status === "PUBLISHED" ? "success" : "outline"}>
              {status === "DRAFT" ? "Черновик" : status === "PUBLISHED" ? "Опубликован" : "Архив"}
            </Badge>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setPreview((p) => !p)}>
            {preview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            {preview ? "Скрыть предпросмотр" : "Предпросмотр"}
          </Button>
          {!readOnly && (
            <>
              <Button variant="outline" onClick={save} disabled={saving}>
                <Save className="h-4 w-4" />
                Сохранить
              </Button>
              <Button onClick={publish} disabled={publishing || saving || questions.length === 0}>
                <Send className="h-4 w-4" />
                Опубликовать
              </Button>
            </>
          )}
        </div>
      </div>

      {readOnly && (
        <p className="mb-4 rounded-md bg-muted px-4 py-3 text-sm text-muted-foreground">
          {forcedReadOnly
            ? "У вас нет прав на редактирование тестов — доступен только просмотр."
            : "Эта версия опубликована и больше не может быть изменена. Чтобы отредактировать вопросы, создайте новую версию теста."}
        </p>
      )}

      {preview ? (
        <TestPreview title={testTitle} questions={questions} />
      ) : (
        <>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={questions.map((q) => q.id)} strategy={verticalListSortingStrategy}>
              <div className="flex flex-col gap-4">
                {questions.map((q, i) => (
                  <QuestionItem
                    key={q.id}
                    index={i}
                    question={q}
                    onChange={(next) => updateQuestion(q.id, next)}
                    onRemove={() => removeQuestion(q.id)}
                    readOnly={readOnly}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>

          {!readOnly && (
            <Button variant="outline" onClick={addQuestion} className="mt-4">
              <Plus className="h-4 w-4" />
              Добавить вопрос
            </Button>
          )}
        </>
      )}
    </div>
  );
}
