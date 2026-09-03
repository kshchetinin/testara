import { auth } from "@/lib/auth";
import { canManageTests } from "@/lib/rbac";
import { TestsListView } from "@/components/tests/tests-list-view";

export default async function TeacherTestsPage() {
  const session = await auth();
  return <TestsListView basePath="/teacher/tests" canManage={canManageTests(session!.user.role)} />;
}
