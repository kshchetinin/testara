import { SidebarNav } from "./sidebar-nav";
import type { WorkspaceVariant } from "./nav-config";
import { LogoutButton } from "./logout-button";
import { Logo } from "./logo";
import { MobileNav } from "./mobile-nav";
import type { Role } from "@/generated/prisma/enums";

export function AppShell({
  workspaceLabel,
  userName,
  userSubtitle,
  variant,
  role,
  children,
}: {
  workspaceLabel: string;
  userName: string;
  userSubtitle: string;
  variant: WorkspaceVariant;
  role: Role;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-background">
      <aside className="no-print fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-border bg-card md:flex">
        <div className="flex items-center gap-2 border-b border-border px-5 py-4">
          <Logo />
          <div>
            <p className="text-sm font-semibold leading-tight">TESTARA</p>
            <p className="text-xs text-muted-foreground leading-tight">{workspaceLabel}</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-4">
          <SidebarNav variant={variant} role={role} />
        </div>

        <div className="border-t border-border p-3">
          <div className="mb-2 px-3">
            <p className="truncate text-sm font-medium">{userName}</p>
            <p className="truncate text-xs text-muted-foreground">{userSubtitle}</p>
          </div>
          <LogoutButton />
        </div>
      </aside>

      <div className="flex min-h-screen w-full flex-col md:pl-64">
        <MobileNav workspaceLabel={workspaceLabel} userName={userName} userSubtitle={userSubtitle} variant={variant} role={role} />
        <main className="flex-1 p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
