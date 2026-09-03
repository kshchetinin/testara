"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";

interface TestOption {
  id: string;
  title: string;
  versions: { id: string; versionNumber: number; questionCount: number }[];
}

interface GroupOption {
  id: string;
  name: string;
}

interface StudentOption {
  id: string;
  name: string;
  groupId: string | null;
  groupName: string | null;
}

const initialForm = {
  testVersionId: "",
  title: "",
  groupIds: [] as string[],
  studentIds: [] as string[],
  questionCount: "",
  availableFrom: "",
  availableUntil: "",
  timeLimitMinutes: "30",
  attemptsAllowed: "1",
  randomizeQuestions: true,
  randomizeAnswers: true,
  showResult: true,
  showCorrectAnswers: false,
  allowResume: true,
};

export function CreateAssignmentDialog({
  tests,
  groups,
  students,
  basePath,
}: {
  tests: TestOption[];
  groups: GroupOption[];
  students: StudentOption[];
  basePath: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [form, setForm] = React.useState(initialForm);
  const [studentSearch, setStudentSearch] = React.useState("");

  function toggleGroup(id: string) {
    setForm((f) => ({ ...f, groupIds: f.groupIds.includes(id) ? f.groupIds.filter((g) => g !== id) : [...f.groupIds, id] }));
  }

  function toggleStudent(id: string) {
    setForm((f) => ({ ...f, studentIds: f.studentIds.includes(id) ? f.studentIds.filter((s) => s !== id) : [...f.studentIds, id] }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          testVersionId: form.testVersionId,
          title: form.title || undefined,
          groupIds: form.groupIds,
          studentIds: form.studentIds,
          questionCount: form.questionCount ? Number(form.questionCount) : undefined,
          availableFrom: form.availableFrom ? new Date(form.availableFrom).toISOString() : undefined,
          availableUntil: form.availableUntil ? new Date(form.availableUntil).toISOString() : undefined,
          timeLimitMinutes: form.timeLimitMinutes ? Number(form.timeLimitMinutes) : undefined,
          attemptsAllowed: Number(form.attemptsAllowed),
          randomizeQuestions: form.randomizeQuestions,
          randomizeAnswers: form.randomizeAnswers,
          showResult: form.showResult,
          showCorrectAnswers: form.showCorrectAnswers,
          allowResume: form.allowResume,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast({ title: "Тестирование назначено", variant: "success" });
      setOpen(false);
      setForm(initialForm);
      setStudentSearch("");
      router.push(`${basePath}/${data.assignment.id}`);
      router.refresh();
    } catch (err) {
      toast({ title: "Не удалось назначить тестирование", description: (err as Error).message, variant: "error" });
    } finally {
      setSubmitting(false);
    }
  }

  const allVersionOptions = tests.flatMap((t) =>
    t.versions.map((v) => ({ id: v.id, label: `${t.title} (v${v.versionNumber})`, questionCount: v.questionCount }))
  );
  const selectedVersion = allVersionOptions.find((v) => v.id === form.testVersionId);

  const filteredStudents = studentSearch.trim()
    ? students.filter((s) => s.name.toLowerCase().includes(studentSearch.trim().toLowerCase()))
    : students;

  return (
    <>
      <Button onClick={() => setOpen(true)} disabled={allVersionOptions.length === 0}>
        <Plus className="h-4 w-4" />
        Назначить тестирование
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogHeader>
          <DialogTitle>Назначить тестирование</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto pr-1">
          <div className="flex flex-col gap-1.5">
            <Label>Тест</Label>
            <Select
              value={form.testVersionId}
              onChange={(e) => setForm((f) => ({ ...f, testVersionId: e.target.value, questionCount: "" }))}
              required
            >
              <option value="">Выберите тест</option>
              {allVersionOptions.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label} — {o.questionCount} вопр.
                </option>
              ))}
            </Select>
          </div>

          {selectedVersion && selectedVersion.questionCount > 1 && (
            <div className="flex flex-col gap-1.5">
              <Label>Сколько вопросов давать студенту</Label>
              <Input
                type="number"
                min={1}
                max={selectedVersion.questionCount}
                placeholder={`Все (${selectedVersion.questionCount})`}
                value={form.questionCount}
                onChange={(e) => setForm((f) => ({ ...f, questionCount: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground">
                Оставьте пустым, чтобы использовать весь банк ({selectedVersion.questionCount} вопросов). Иначе каждому студенту
                случайно выберется указанное количество вопросов из банка.
              </p>
            </div>
          )}

          <div>
            <Label>Группы</Label>
            <div className="mt-2 flex flex-wrap gap-3">
              {groups.map((g) => (
                <label key={g.id} className="flex items-center gap-2 text-sm">
                  <Checkbox checked={form.groupIds.includes(g.id)} onChange={() => toggleGroup(g.id)} />
                  {g.name}
                </label>
              ))}
            </div>
          </div>

          <div>
            <Label>Отдельные студенты (необязательно)</Label>
            <div className="relative mt-2">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                placeholder="Поиск по ФИО"
                className="pl-9"
              />
            </div>
            <div className="mt-2 max-h-40 overflow-y-auto rounded-md border border-border p-2">
              {filteredStudents.length === 0 && <p className="p-2 text-sm text-muted-foreground">Никого не найдено</p>}
              {filteredStudents.map((s) => (
                <label key={s.id} className="flex items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted">
                  <Checkbox checked={form.studentIds.includes(s.id)} onChange={() => toggleStudent(s.id)} />
                  {s.name}
                  {s.groupName && <span className="text-xs text-muted-foreground">({s.groupName})</span>}
                </label>
              ))}
            </div>
            {form.studentIds.length > 0 && (
              <p className="mt-1 text-xs text-muted-foreground">Выбрано студентов: {form.studentIds.length}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Доступно с</Label>
              <Input type="datetime-local" value={form.availableFrom} onChange={(e) => setForm((f) => ({ ...f, availableFrom: e.target.value }))} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Доступно до</Label>
              <Input type="datetime-local" value={form.availableUntil} onChange={(e) => setForm((f) => ({ ...f, availableUntil: e.target.value }))} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Время на тест (мин)</Label>
              <Input
                type="number"
                min={1}
                value={form.timeLimitMinutes}
                onChange={(e) => setForm((f) => ({ ...f, timeLimitMinutes: e.target.value }))}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Количество попыток</Label>
              <Input
                type="number"
                min={1}
                value={form.attemptsAllowed}
                onChange={(e) => setForm((f) => ({ ...f, attemptsAllowed: e.target.value }))}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2 rounded-md border border-border p-3">
            {[
              ["randomizeQuestions", "Случайный порядок вопросов"],
              ["randomizeAnswers", "Случайный порядок вариантов ответа"],
              ["showResult", "Показывать результат студенту"],
              ["showCorrectAnswers", "Показывать правильные ответы"],
              ["allowResume", "Разрешить продолжение после выхода"],
            ].map(([key, label]) => (
              <label key={key} className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={form[key as keyof typeof form] as boolean}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.checked }))}
                />
                {label}
              </label>
            ))}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Отмена
            </Button>
            <Button type="submit" disabled={submitting || !form.testVersionId || (form.groupIds.length === 0 && form.studentIds.length === 0)}>
              Назначить
            </Button>
          </DialogFooter>
        </form>
      </Dialog>
    </>
  );
}
