"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Ban, CheckCircle2, Archive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { roleLabel } from "@/lib/rbac";
import type { Role, UserStatus } from "@/generated/prisma/enums";

interface GroupOption {
  id: string;
  name: string;
}

interface SubjectOption {
  id: string;
  name: string;
}

interface UserData {
  id: string;
  login: string;
  firstName: string;
  lastName: string;
  middleName: string | null;
  role: Role;
  status: UserStatus;
  groupId: string | null;
  subjectIds: string[];
  createdAt: string | Date;
  lastLoginAt: string | Date | null;
}

const STATUS_LABEL: Record<UserStatus, string> = { ACTIVE: "Активен", BLOCKED: "Заблокирован", ARCHIVED: "Архив" };
const STATUS_VARIANT: Record<UserStatus, "success" | "destructive" | "secondary"> = {
  ACTIVE: "success",
  BLOCKED: "destructive",
  ARCHIVED: "secondary",
};

export function UserDetailPanel({ user, groups, subjects = [] }: { user: UserData; groups: GroupOption[]; subjects?: SubjectOption[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const isSubjectScoped = user.role === "TEACHER" || user.role === "METHODIST";
  const [form, setForm] = React.useState({
    lastName: user.lastName,
    firstName: user.firstName,
    middleName: user.middleName ?? "",
    groupId: user.groupId ?? "",
    subjectIds: user.subjectIds,
  });
  const [savingProfile, setSavingProfile] = React.useState(false);
  const [statusBusy, setStatusBusy] = React.useState(false);
  const [resetDialogOpen, setResetDialogOpen] = React.useState(false);
  const [generatedPassword, setGeneratedPassword] = React.useState<string | null>(null);
  const [resetting, setResetting] = React.useState(false);

  function toggleSubject(id: string) {
    setForm((f) => ({ ...f, subjectIds: f.subjectIds.includes(id) ? f.subjectIds.filter((s) => s !== id) : [...f.subjectIds, id] }));
  }

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lastName: form.lastName,
          firstName: form.firstName,
          middleName: form.middleName || null,
          ...(user.role === "STUDENT" ? { groupId: form.groupId || null } : {}),
          ...(isSubjectScoped ? { subjectIds: form.subjectIds } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast({ title: "Данные сохранены", variant: "success" });
      router.refresh();
    } catch (err) {
      toast({ title: "Не удалось сохранить", description: (err as Error).message, variant: "error" });
    } finally {
      setSavingProfile(false);
    }
  }

  async function changeStatus(status: UserStatus) {
    setStatusBusy(true);
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast({ title: "Статус изменён", variant: "success" });
      router.refresh();
    } catch (err) {
      toast({ title: "Не удалось изменить статус", description: (err as Error).message, variant: "error" });
    } finally {
      setStatusBusy(false);
    }
  }

  async function handleReset() {
    setResetting(true);
    try {
      const res = await fetch(`/api/users/${user.id}/reset-password`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setGeneratedPassword(data.password);
    } catch (err) {
      toast({ title: "Не удалось сбросить пароль", description: (err as Error).message, variant: "error" });
    } finally {
      setResetting(false);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Профиль</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={saveProfile} className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label>Фамилия</Label>
                <Input value={form.lastName} onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))} required />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Имя</Label>
                <Input value={form.firstName} onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))} required />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Отчество</Label>
              <Input value={form.middleName} onChange={(e) => setForm((f) => ({ ...f, middleName: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label>Логин</Label>
                <Input value={user.login} disabled />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Роль</Label>
                <Input value={roleLabel(user.role)} disabled />
              </div>
            </div>
            {user.role === "STUDENT" && (
              <div className="flex flex-col gap-1.5">
                <Label>Группа</Label>
                <Select value={form.groupId} onChange={(e) => setForm((f) => ({ ...f, groupId: e.target.value }))}>
                  <option value="">Без группы</option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </Select>
              </div>
            )}
            {isSubjectScoped && (
              <div className="flex flex-col gap-1.5">
                <Label>Предметы</Label>
                {subjects.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Сначала создайте предмет в разделе «Предметы».</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {subjects.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => toggleSubject(s.id)}
                        className={`rounded-full border px-3 py-1 text-xs ${
                          form.subjectIds.includes(s.id) ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground"
                        }`}
                      >
                        {s.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            <div>
              <Button type="submit" disabled={savingProfile || (isSubjectScoped && form.subjectIds.length === 0)}>
                Сохранить
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Доступ</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Статус</span>
            <Badge variant={STATUS_VARIANT[user.status]}>{STATUS_LABEL[user.status]}</Badge>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Создан</span>
            <span>{new Date(user.createdAt).toLocaleDateString("ru-RU")}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Последний вход</span>
            <span>{user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString("ru-RU") : "—"}</span>
          </div>

          <div className="flex flex-col gap-2 border-t border-border pt-4">
            {user.status !== "ACTIVE" && (
              <Button variant="outline" disabled={statusBusy} onClick={() => changeStatus("ACTIVE")}>
                <CheckCircle2 className="h-4 w-4" />
                Активировать
              </Button>
            )}
            {user.status !== "BLOCKED" && (
              <Button variant="outline" disabled={statusBusy} onClick={() => changeStatus("BLOCKED")}>
                <Ban className="h-4 w-4" />
                Заблокировать
              </Button>
            )}
            {user.status !== "ARCHIVED" && (
              <Button variant="outline" disabled={statusBusy} onClick={() => changeStatus("ARCHIVED")}>
                <Archive className="h-4 w-4" />
                Архивировать
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => {
                setGeneratedPassword(null);
                setResetDialogOpen(true);
              }}
            >
              <KeyRound className="h-4 w-4" />
              Сбросить пароль
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <DialogHeader>
          <DialogTitle>Сброс пароля</DialogTitle>
          <DialogDescription>Будет сгенерирован новый пароль. Сообщите его студенту лично — после закрытия окна он больше не будет показан.</DialogDescription>
        </DialogHeader>
        {generatedPassword ? (
          <div className="rounded-md bg-muted p-4 text-center font-mono text-lg tracking-wider">{generatedPassword}</div>
        ) : (
          <p className="text-sm text-muted-foreground">Нажмите «Сгенерировать», чтобы создать новый пароль.</p>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => setResetDialogOpen(false)}>
            Закрыть
          </Button>
          {!generatedPassword && (
            <Button onClick={handleReset} disabled={resetting}>
              Сгенерировать
            </Button>
          )}
        </DialogFooter>
      </Dialog>
    </div>
  );
}
