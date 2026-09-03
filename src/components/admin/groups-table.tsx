"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Archive, RotateCcw, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";

interface GroupRow {
  id: string;
  name: string;
  status: "ACTIVE" | "ARCHIVED";
  createdAt: string | Date;
  _count: { students: number };
}

export function GroupsTable({ groups }: { groups: GroupRow[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [createOpen, setCreateOpen] = React.useState(false);
  const [renameTarget, setRenameTarget] = React.useState<GroupRow | null>(null);
  const [name, setName] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast({ title: "Группа создана", variant: "success" });
      setCreateOpen(false);
      setName("");
      router.refresh();
    } catch (err) {
      toast({ title: "Не удалось создать группу", description: (err as Error).message, variant: "error" });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRename(e: React.FormEvent) {
    e.preventDefault();
    if (!renameTarget) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/groups/${renameTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast({ title: "Группа переименована", variant: "success" });
      setRenameTarget(null);
      router.refresh();
    } catch (err) {
      toast({ title: "Не удалось переименовать группу", description: (err as Error).message, variant: "error" });
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleStatus(group: GroupRow) {
    const nextStatus = group.status === "ACTIVE" ? "ARCHIVED" : "ACTIVE";
    try {
      const res = await fetch(`/api/groups/${group.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast({ title: nextStatus === "ARCHIVED" ? "Группа архивирована" : "Группа восстановлена", variant: "success" });
      router.refresh();
    } catch (err) {
      toast({ title: "Не удалось изменить статус", description: (err as Error).message, variant: "error" });
    }
  }

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button onClick={() => { setName(""); setCreateOpen(true); }}>
          <Plus className="h-4 w-4" />
          Создать группу
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Название</TableHead>
            <TableHead>Статус</TableHead>
            <TableHead>Студентов</TableHead>
            <TableHead className="text-right">Действия</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {groups.length === 0 && (
            <TableRow>
              <TableCell colSpan={4} className="text-center text-muted-foreground">
                Групп пока нет
              </TableCell>
            </TableRow>
          )}
          {groups.map((group) => (
            <TableRow key={group.id}>
              <TableCell className="font-medium">
                <Link href={`/admin/groups/${group.id}`} className="hover:underline">
                  {group.name}
                </Link>
              </TableCell>
              <TableCell>
                <Badge variant={group.status === "ACTIVE" ? "success" : "secondary"}>
                  {group.status === "ACTIVE" ? "Активна" : "Архив"}
                </Badge>
              </TableCell>
              <TableCell>{group._count.students}</TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    title="Переименовать"
                    onClick={() => { setRenameTarget(group); setName(group.name); }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    title={group.status === "ACTIVE" ? "Архивировать" : "Восстановить"}
                    onClick={() => toggleStatus(group)}
                  >
                    {group.status === "ACTIVE" ? <Archive className="h-4 w-4" /> : <RotateCcw className="h-4 w-4" />}
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogHeader>
          <DialogTitle>Новая группа</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleCreate} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="group-name">Название</Label>
            <Input id="group-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Например, 401" required autoFocus />
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
          <DialogTitle>Переименовать группу</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleRename} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="rename-group-name">Название</Label>
            <Input id="rename-group-name" value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
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
