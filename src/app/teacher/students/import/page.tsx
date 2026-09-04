import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { canManageStudents, roleHome } from "@/lib/rbac";
import { StudentImportWizard } from "@/components/shared/student-import-wizard";

export default async function TeacherStudentImportPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!canManageStudents(session.user.role)) redirect(roleHome(session.user.role));

  return <StudentImportWizard redirectPath="/teacher/students" />;
}
