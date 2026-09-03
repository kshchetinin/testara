"use client";

import * as React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Trash2, Plus, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { QUESTION_TYPE_LABELS, emptyQuestion, type QuestionDraft, type QuestionTypeDraft } from "./types";

interface Props {
  index: number;
  question: QuestionDraft;
  onChange: (next: QuestionDraft) => void;
  onRemove: () => void;
  readOnly?: boolean;
}

export function QuestionItem({ index, question, onChange, onRemove, readOnly = false }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: question.id, disabled: readOnly });
  const style = { transform: CSS.Transform.toString(transform), transition };

  function changeType(type: QuestionTypeDraft) {
    const fresh = emptyQuestion(type);
    onChange({ ...fresh, id: question.id, text: question.text, explanation: question.explanation, points: question.points });
  }

  function updateAnswer(id: string, patch: Partial<QuestionDraft["answers"][number]>) {
    onChange({ ...question, answers: question.answers.map((a) => (a.id === id ? { ...a, ...patch } : a)) });
  }

  function setSingleCorrect(id: string) {
    onChange({ ...question, answers: question.answers.map((a) => ({ ...a, isCorrect: a.id === id })) });
  }

  function addAnswer() {
    onChange({ ...question, answers: [...question.answers, { id: crypto.randomUUID(), text: "", isCorrect: false }] });
  }

  function removeAnswer(id: string) {
    onChange({ ...question, answers: question.answers.filter((a) => a.id !== id) });
  }

  function addTextAnswer() {
    onChange({ ...question, correctTextAnswers: [...question.correctTextAnswers, ""] });
  }

  function updateTextAnswer(idx: number, value: string) {
    const next = [...question.correctTextAnswers];
    next[idx] = value;
    onChange({ ...question, correctTextAnswers: next });
  }

  function removeTextAnswer(idx: number) {
    onChange({ ...question, correctTextAnswers: question.correctTextAnswers.filter((_, i) => i !== idx) });
  }

  return (
    <div ref={setNodeRef} style={style} className={cn(isDragging && "opacity-50")}>
      <Card>
        <CardContent className="flex gap-3 p-4">
          {!readOnly && (
            <button
              type="button"
              {...attributes}
              {...listeners}
              className="mt-1 shrink-0 cursor-grab touch-none text-muted-foreground hover:text-foreground active:cursor-grabbing"
              aria-label="Перетащить"
            >
              <GripVertical className="h-5 w-5" />
            </button>
          )}

          <fieldset disabled={readOnly} className="m-0 flex-1 flex flex-col gap-3 border-0 p-0">
            <div className="flex items-start gap-3">
              <span className="mt-2 shrink-0 text-sm font-medium text-muted-foreground">№{index + 1}</span>
              <Textarea
                value={question.text}
                onChange={(e) => onChange({ ...question, text: e.target.value })}
                placeholder="Текст вопроса"
                className="min-h-16 flex-1"
              />
              {!readOnly && (
                <Button type="button" variant="ghost" size="icon" onClick={onRemove} title="Удалить вопрос">
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Select value={question.type} onChange={(e) => changeType(e.target.value as QuestionTypeDraft)} className="sm:col-span-2">
                {Object.entries(QUESTION_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
              <div className="flex items-center gap-2">
                <label className="whitespace-nowrap text-sm text-muted-foreground">Баллы</label>
                <Input
                  type="number"
                  min={1}
                  max={100}
                  value={question.points}
                  onChange={(e) => onChange({ ...question, points: Number(e.target.value) || 1 })}
                  className="w-20"
                />
              </div>
              {question.type === "MULTIPLE_CHOICE" && (
                <Select
                  value={question.scoringMode}
                  onChange={(e) => onChange({ ...question, scoringMode: e.target.value as "FULL_MATCH" | "PARTIAL" })}
                >
                  <option value="FULL_MATCH">Балл за точное совпадение</option>
                  <option value="PARTIAL">Частичные баллы</option>
                </Select>
              )}
            </div>

            {question.type === "TEXT_ANSWER" ? (
              <div className="flex flex-col gap-2">
                <p className="text-xs text-muted-foreground">Допустимые варианты ответа (сравнение без учёта регистра)</p>
                {question.correctTextAnswers.map((val, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <Input value={val} onChange={(e) => updateTextAnswer(idx, e.target.value)} placeholder="Например: метастазирование" />
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeTextAnswer(idx)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={addTextAnswer} className="self-start">
                  <Plus className="h-4 w-4" />
                  Добавить вариант
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {question.answers.map((answer) => (
                  <div key={answer.id} className="flex items-center gap-2">
                    <input
                      type={question.type === "MULTIPLE_CHOICE" ? "checkbox" : "radio"}
                      name={`correct-${question.id}`}
                      checked={answer.isCorrect}
                      onChange={(e) =>
                        question.type === "MULTIPLE_CHOICE"
                          ? updateAnswer(answer.id, { isCorrect: e.target.checked })
                          : setSingleCorrect(answer.id)
                      }
                      className="h-4 w-4 accent-[var(--primary)]"
                      title="Правильный ответ"
                    />
                    <Input
                      value={answer.text}
                      onChange={(e) => updateAnswer(answer.id, { text: e.target.value })}
                      placeholder="Вариант ответа"
                      disabled={question.type === "TRUE_FALSE"}
                      className="flex-1"
                    />
                    {question.type !== "TRUE_FALSE" && question.answers.length > 2 && (
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeAnswer(answer.id)}>
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                {question.type !== "TRUE_FALSE" && (
                  <Button type="button" variant="outline" size="sm" onClick={addAnswer} className="self-start">
                    <Plus className="h-4 w-4" />
                    Добавить вариант
                  </Button>
                )}
              </div>
            )}

            <Textarea
              value={question.explanation}
              onChange={(e) => onChange({ ...question, explanation: e.target.value })}
              placeholder="Пояснение к ответу (необязательно)"
              className="min-h-12"
            />
          </fieldset>
        </CardContent>
      </Card>
    </div>
  );
}
