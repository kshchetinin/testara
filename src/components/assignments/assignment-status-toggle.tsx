"use client";

import { useRouter } from "next/navigation";
import * as React from "react";
import { Lock, Unlock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

export function AssignmentStatusToggle({ id, status }: { id: string; status: "ACTIVE" | "CLOSED" }) {
  const router = useRouter();
  const { toast } = useToast();
  const [busy, setBusy] = React.useState(false);

  async function toggle() {
    setBusy(true);
    try {
      const res = await fetch(`/api/assignments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: status === "ACTIVE" ? "CLOSED" : "ACTIVE" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast({ title: status === "ACTIVE" ? "Тестирование закрыто" : "Тестирование возобновлено", variant: "success" });
      router.refresh();
    } catch (err) {
      toast({ title: "Не удалось изменить статус", description: (err as Error).message, variant: "error" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button variant="outline" onClick={toggle} disabled={busy}>
      {status === "ACTIVE" ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
      {status === "ACTIVE" ? "Закрыть тестирование" : "Возобновить"}
    </Button>
  );
}
