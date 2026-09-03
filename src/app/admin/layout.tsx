import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { roleHome, roleLabel } from "@/lib/rbac";
import { AppShell } from "@/components/shared/app-shell";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "ADMIN") redirect(roleHome(session.user.role));

  return (
    <AppShell
      workspaceLabel="Администратор"
      userName={session.user.name}
      userSubtitle={roleLabel(session.user.role)}
      variant="admin"
    >
      {children}
    </AppShell>
  );
}
