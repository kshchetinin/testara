"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, Archive, RotateCcw, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";

interface SubjectRow {
  id: string;
  name: string;
  status: "ACTIVE" | "ARCHIVED";
  createdAt: string | Date;
  _count: { teachers: number; tests: number };
}

export function SubjectsTable({ subjects }: { subjects: SubjectRow[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [createOpen, setCreateOpen] = React.useState(false);
  const [renameTarget, setRenameTarget] = React.useState<SubjectRow | null>(null);
  const [name, setName] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/subjects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast({ title: "Предмет создан", variant: "success" });
      setCreateOpen(false);
      setName("");
      router.refresh();
    } catch (err) {
      toast({ title: "Не удалось создать предмет", description: (err as Error).message, variant: "error" });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRename(e: React.FormEvent) {
    e.preventDefault();
    if (!renameTarget) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/subjects/${renameTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast({ title: "Предмет переименован", variant: "success" });
      setRenameTarget(null);
      router.refresh();
    } catch (err) {
      toast({ title: "Не удалось переименовать предмет", description: (err as Error).message, variant: "error" });
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleStatus(subject: SubjectRow) {
    const nextStatus = subject.status === "ACTIVE" ? "ARCHIVED" : "ACTIVE";
    try {
      const res = await fetch(`/api/subjects/${subject.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast({ title: nextStatus === "ARCHIVED" ? "Предмет архивирован" : "Предмет восстановлен", variant: "success" });
      router.refresh();
    } catch (err) {
      toast({ title: "Не удалось изменить статус", description: (err as Error).message, variant: "error" });
    }
  }

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button
          onClick={() => {
            setName("");
            setCreateOpen(true);
          }}
        >
          <Plus className="h-4 w-4" />
          Добавить предмет
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Название</TableHead>
            <TableHead>Статус</TableHead>
            <TableHead>Преподавателей/методистов</TableHead>
            <TableHead>Тестов</TableHead>
            <TableHead className="text-right">Действия</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {subjects.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground">
                Предметов пока нет
              </TableCell>
            </TableRow>
          )}
          {subjects.map((subject) => (
            <TableRow key={subject.id}>
              <TableCell className="font-medium">{subject.name}</TableCell>
              <TableCell>
                <Badge variant={subject.status === "ACTIVE" ? "success" : "secondary"}>
                  {subject.status === "ACTIVE" ? "Активен" : "Архив"}
                </Badge>
              </TableCell>
              <TableCell>{subject._count.teachers}</TableCell>
              <TableCell>{subject._count.tests}</TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    title="Переименовать"
                    onClick={() => {
                      setRenameTarget(subject);
                      setName(subject.name);
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" title={subject.status === "ACTIVE" ? "Архивировать" : "Восстановить"} onClick={() => toggleStatus(subject)}>
                    {subject.status === "ACTIVE" ? <Archive className="h-4 w-4" /> : <RotateCcw className="h-4 w-4" />}
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogHeader>
          <DialogTitle>Новый предмет</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleCreate} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="subject-name">Название</Label>
            <Input id="subject-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Например, Онкология" required autoFocus />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
              Отмена
            </Button>
            <Button type="submit" disabled={submitting}>
              Создать
            </Button>
          </DialogFooter>
        </form>
      </Dialog>

      <Dialog open={!!renameTarget} onOpenChange={(open) => !open && setRenameTarget(null)}>
        <DialogHeader>
          <DialogTitle>Переименовать предмет</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleRename} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="rename-subject-name">Название</Label>
            <Input id="rename-subject-name" value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setRenameTarget(null)}>
              Отмена
            </Button>
            <Button type="submit" disabled={submitting}>
              Сохранить
            </Button>
          </DialogFooter>
        </form>
      </Dialog>
    </div>
  );
}
