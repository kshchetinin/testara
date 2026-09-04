"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, Dices } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Dialog, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";

interface GroupOption {
  id: string;
  name: string;
}

function randomPassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  return Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

const initialForm = {
  lastName: "",
  firstName: "",
  middleName: "",
  login: "",
  password: "",
  role: "STUDENT",
  groupId: "",
};

export function CreateUserDialog({ groups, studentOnly = false }: { groups: GroupOption[]; studentOnly?: boolean }) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = React.useState(false);
  const [form, setForm] = React.useState(initialForm);
  const [submitting, setSubmitting] = React.useState(false);

  function set<K extends keyof typeof initialForm>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          login: form.login,
          password: form.password,
          firstName: form.firstName,
          lastName: form.lastName,
          middleName: form.middleName || undefined,
          role: form.role,
          groupId: form.role === "STUDENT" && form.groupId ? form.groupId : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast({ title: "Пользователь создан", variant: "success" });
      setOpen(false);
      setForm(initialForm);
      router.refresh();
    } catch (err) {
      toast({ title: "Не удалось создать пользователя", description: (err as Error).message, variant: "error" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" />
        {studentOnly ? "Добавить студента" : "Добавить пользователя"}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogHeader>
          <DialogTitle>{studentOnly ? "Новый студент" : "Новый пользователь"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Фамилия</Label>
              <Input value={form.lastName} onChange={(e) => set("lastName", e.target.value)} required autoFocus />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Имя</Label>
              <Input value={form.firstName} onChange={(e) => set("firstName", e.target.value)} required />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Отчество</Label>
            <Input value={form.middleName} onChange={(e) => set("middleName", e.target.value)} />
          </div>

          {studentOnly ? (
            <div className="flex flex-col gap-1.5">
              <Label>Группа</Label>
              <Select value={form.groupId} onChange={(e) => set("groupId", e.target.value)}>
                <option value="">Без группы</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </Select>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label>Роль</Label>
                <Select value={form.role} onChange={(e) => set("role", e.target.value)}>
                  <option value="STUDENT">Студент</option>
                  <option value="TEACHER">Преподаватель</option>
                  <option value="METHODIST">Методист</option>
                  <option value="ADMIN">Администратор</option>
                </Select>
              </div>
              {form.role === "STUDENT" && (
                <div className="flex flex-col gap-1.5">
                  <Label>Группа</Label>
                  <Select value={form.groupId} onChange={(e) => set("groupId", e.target.value)}>
                    <option value="">Без группы</option>
                    {groups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </Select>
                </div>
              )}
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <Label>Логин</Label>
            <Input value={form.login} onChange={(e) => set("login", e.target.value)} required placeholder="latinname1" />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Пароль</Label>
            <div className="flex gap-2">
              <Input value={form.password} onChange={(e) => set("password", e.target.value)} required minLength={6} />
              <Button type="button" variant="outline" size="icon" title="Сгенерировать пароль" onClick={() => set("password", randomPassword())}>
                <Dices className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Отмена
            </Button>
            <Button type="submit" disabled={submitting}>
              Создать
            </Button>
          </DialogFooter>
        </form>
      </Dialog>
    </>
  );
}
