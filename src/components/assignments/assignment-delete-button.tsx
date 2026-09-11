"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";

export function AssignmentDeleteButton({ id, basePath }: { id: string; basePath: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  async function handleDelete() {
    setBusy(true);
    try {
      const res = await fetch(`/api/assignments/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast({ title: "Назначение удалено", variant: "success" });
      router.push(basePath);
      router.refresh();
    } catch (err) {
      toast({ title: "Не удалось удалить назначение", description: (err as Error).message, variant: "error" });
      setBusy(false);
    }
  }

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <Trash2 className="h-4 w-4" />
        Удалить
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogHeader>
          <DialogTitle>Удалить назначение?</DialogTitle>
          <DialogDescription>
            Тестирование будет удалено безвозвратно. Это доступно только пока никто из студентов ещё не начал его проходить.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Отмена
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={busy}>
            Удалить
          </Button>
        </DialogFooter>
      </Dialog>
    </>
  );
}
