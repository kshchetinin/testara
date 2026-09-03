import { auth } from "@/lib/auth";
import { canManageTests } from "@/lib/rbac";
import { TestDetailView } from "@/components/tests/test-detail-view";

export default async function TeacherTestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  return <TestDetailView testId={id} basePath="/teacher/tests" canManage={canManageTests(session!.user.role)} />;
}
