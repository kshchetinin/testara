"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { Menu, X } from "lucide-react";
import { SidebarNav } from "./sidebar-nav";
import type { WorkspaceVariant } from "./nav-config";
import { LogoutButton } from "./logout-button";
import { Logo } from "./logo";
import { Wordmark } from "./wordmark";
import type { Role } from "@/generated/prisma/enums";

// Mirrors the Dialog component's client-detection pattern: createPortal needs
// `document`, which doesn't exist during server rendering.
function useIsClient() {
  return React.useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
}

export function MobileNav({
  workspaceLabel,
  userName,
  userSubtitle,
  variant,
  role,
}: {
  workspaceLabel: string;
  userName: string;
  userSubtitle: string;
  variant: WorkspaceVariant;
  role: Role;
}) {
  const [open, setOpen] = React.useState(false);
  const mounted = useIsClient();

  React.useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <>
      <header className="no-print sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-card px-4 py-3 md:hidden">
        <button
          onClick={() => setOpen(true)}
          className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Открыть меню"
        >
          <Menu className="h-5 w-5" />
        </button>
        <Logo />
        <p className="text-sm font-semibold">
          <Wordmark />
        </p>
      </header>

      {mounted && open
        ? createPortal(
            <div className="fixed inset-0 z-50 flex md:hidden">
              <div className="fixed inset-0 bg-black/50" onClick={() => setOpen(false)} />
              <div className="relative z-10 flex h-full w-64 flex-col border-r border-border bg-card">
                <div className="flex items-center justify-between gap-2 border-b border-border px-5 py-4">
                  <div className="flex items-center gap-2">
                    <Logo />
                    <div>
                      <p className="text-sm font-semibold leading-tight">
                        <Wordmark />
                      </p>
                      <p className="text-xs text-muted-foreground leading-tight">{workspaceLabel}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setOpen(false)}
                    className="rounded-sm text-muted-foreground hover:text-foreground"
                    aria-label="Закрыть меню"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto px-3 py-4" onClick={() => setOpen(false)}>
                  <SidebarNav variant={variant} role={role} />
                </div>

                <div className="border-t border-border p-3">
                  <div className="mb-2 px-3">
                    <p className="truncate text-sm font-medium">{userName}</p>
                    <p className="truncate text-xs text-muted-foreground">{userSubtitle}</p>
                  </div>
                  <LogoutButton />
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </>
  );
}
