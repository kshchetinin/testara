import { auth } from "@/lib/auth";
import { canManageTests } from "@/lib/rbac";
import { TestsListView } from "@/components/tests/tests-list-view";
import { getUserSubjectIds } from "@/server/services/subjectsService";

export default async function TeacherTestsPage() {
  const session = await auth();
  const subjectIds = await getUserSubjectIds(session!.user.id);
  return <TestsListView basePath="/teacher/tests" canManage={canManageTests(session!.user.role)} subjectIds={subjectIds} />;
}
