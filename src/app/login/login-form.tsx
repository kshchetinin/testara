"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/shared/logo";
import { loginAction, type LoginState } from "./actions";

const initialState: LoginState = { error: null };

export function LoginForm({ callbackUrl }: { callbackUrl?: string }) {
  const [state, formAction, isPending] = useActionState(loginAction, initialState);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <Logo size="lg" />
          <div>
            <h1 className="text-xl font-semibold text-foreground">TESTARA</h1>
            <p className="text-sm text-muted-foreground">Платформа оценки знаний</p>
          </div>
        </div>

        <form action={formAction} className="flex flex-col gap-4 rounded-lg border border-border bg-card p-6 shadow-sm">
          <input type="hidden" name="callbackUrl" value={callbackUrl ?? ""} />

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="login">Логин</Label>
            <Input id="login" name="login" autoComplete="username" autoFocus required />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password">Пароль</Label>
            <Input id="password" name="password" type="password" autoComplete="current-password" required />
          </div>

          {state.error && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{state.error}</p>
          )}

          <Button type="submit" disabled={isPending} className="mt-2">
            {isPending ? "Вход…" : "Войти"}
          </Button>
        </form>
      </div>
    </div>
  );
}
