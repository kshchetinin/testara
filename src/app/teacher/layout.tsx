import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { roleHome, roleLabel } from "@/lib/rbac";
import { AppShell } from "@/components/shared/app-shell";

export default async function TeacherLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!["ADMIN", "METHODIST", "TEACHER"].includes(session.user.role)) redirect(roleHome(session.user.role));

  return (
    <AppShell
      workspaceLabel="Преподаватель"
      userName={session.user.name}
      userSubtitle={roleLabel(session.user.role)}
      variant="teacher"
      role={session.user.role}
    >
      {children}
    </AppShell>
  );
}
