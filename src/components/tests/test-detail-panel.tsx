"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Archive, RotateCcw, FilePlus2, Pencil, Eye, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";

interface VersionRow {
  id: string;
  versionNumber: number;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  publishedAt: string | Date | null;
  _count: { questions: number; assignments: number };
}

interface SubjectOption {
  id: string;
  name: string;
}

interface TestData {
  id: string;
  title: string;
  description: string | null;
  subjectId: string;
  subject: SubjectOption;
  topic: string | null;
  status: "ACTIVE" | "ARCHIVED";
  versions: VersionRow[];
}

const STATUS_LABEL: Record<VersionRow["status"], string> = { DRAFT: "Черновик", PUBLISHED: "Опубликован", ARCHIVED: "Архив" };
const STATUS_VARIANT: Record<VersionRow["status"], "secondary" | "success" | "outline"> = {
  DRAFT: "secondary",
  PUBLISHED: "success",
  ARCHIVED: "outline",
};

export function TestDetailPanel({ test, basePath, canManage }: { test: TestData; basePath: string; canManage: boolean }) {
  const router = useRouter();
  const { toast } = useToast();
  const [form, setForm] = React.useState({
    title: test.title,
    subjectId: test.subjectId,
    topic: test.topic ?? "",
    description: test.description ?? "",
  });
  const [subjects, setSubjects] = React.useState<SubjectOption[]>([test.subject]);
  const [saving, setSaving] = React.useState(false);
  const [creatingVersion, setCreatingVersion] = React.useState(false);

  React.useEffect(() => {
    if (!canManage) return;
    fetch("/api/subjects?mine=1")
      .then((res) => res.json())
      .then((data: { subjects?: SubjectOption[] }) => {
        const list = data.subjects ?? [];
        setSubjects(list.some((s) => s.id === test.subject.id) ? list : [test.subject, ...list]);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canManage]);

  const hasDraft = test.versions.some((v) => v.status === "DRAFT");

  async function saveMeta(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/tests/${test.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast({ title: "Сохранено", variant: "success" });
      router.refresh();
    } catch (err) {
      toast({ title: "Не удалось сохранить", description: (err as Error).message, variant: "error" });
    } finally {
      setSaving(false);
    }
  }

  async function toggleArchive() {
    const nextStatus = test.status === "ACTIVE" ? "ARCHIVED" : "ACTIVE";
    try {
      const res = await fetch(`/api/tests/${test.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast({ title: nextStatus === "ARCHIVED" ? "Тест архивирован" : "Тест восстановлен", variant: "success" });
      router.refresh();
    } catch (err) {
      toast({ title: "Не удалось изменить статус", description: (err as Error).message, variant: "error" });
    }
  }

  async function createNewVersion() {
    setCreatingVersion(true);
    try {
      const res = await fetch(`/api/tests/${test.id}/versions`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      router.push(`${basePath}/${test.id}/versions/${data.version.id}/edit`);
    } catch (err) {
      toast({ title: "Не удалось создать версию", description: (err as Error).message, variant: "error" });
    } finally {
      setCreatingVersion(false);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Метаданные</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={saveMeta} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>Название</Label>
              <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} disabled={!canManage} required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label>Дисциплина</Label>
                <Select value={form.subjectId} onChange={(e) => setForm((f) => ({ ...f, subjectId: e.target.value }))} disabled={!canManage} required>
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Тема</Label>
                <Input value={form.topic} onChange={(e) => setForm((f) => ({ ...f, topic: e.target.value }))} disabled={!canManage} />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Описание</Label>
              <Textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} disabled={!canManage} />
            </div>
            {canManage && (
              <div>
                <Button type="submit" disabled={saving}>
                  Сохранить
                </Button>
              </div>
            )}
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Состояние</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Статус теста</span>
            <Badge variant={test.status === "ACTIVE" ? "success" : "secondary"}>{test.status === "ACTIVE" ? "Активен" : "Архив"}</Badge>
          </div>
          {canManage && (
            <Button variant="outline" onClick={toggleArchive}>
              {test.status === "ACTIVE" ? <Archive className="h-4 w-4" /> : <RotateCcw className="h-4 w-4" />}
              {test.status === "ACTIVE" ? "Архивировать тест" : "Восстановить тест"}
            </Button>
          )}
          {canManage && !hasDraft && (
            <Button onClick={createNewVersion} disabled={creatingVersion}>
              <FilePlus2 className="h-4 w-4" />
              Создать новую версию
            </Button>
          )}
        </CardContent>
      </Card>

      <Card className="lg:col-span-3">
        <CardHeader>
          <CardTitle>Версии</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Версия</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead>Вопросов</TableHead>
                <TableHead>Назначений</TableHead>
                <TableHead>Опубликована</TableHead>
                <TableHead className="text-right">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {test.versions.map((v) => (
                <TableRow key={v.id}>
                  <TableCell>v{v.versionNumber}</TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANT[v.status]}>{STATUS_LABEL[v.status]}</Badge>
                  </TableCell>
                  <TableCell>{v._count.questions}</TableCell>
                  <TableCell>{v._count.assignments}</TableCell>
                  <TableCell>{v.publishedAt ? new Date(v.publishedAt).toLocaleDateString("ru-RU") : "—"}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-4">
                      {v._count.questions > 0 && (
                        <a
                          href={`/api/tests/${test.id}/versions/${v.id}/export`}
                          className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                          title="Скачать .xlsx"
                        >
                          <Download className="h-3.5 w-3.5" />
                          .xlsx
                        </a>
                      )}
                      <Link
                        href={`${basePath}/${test.id}/versions/${v.id}/edit`}
                        className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                      >
                        {v.status === "DRAFT" && canManage ? <Pencil className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        {v.status === "DRAFT" && canManage ? "Редактировать" : "Просмотр"}
                      </Link>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
