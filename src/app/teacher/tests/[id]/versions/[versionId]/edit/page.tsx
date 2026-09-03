import { auth } from "@/lib/auth";
import { canManageTests } from "@/lib/rbac";
import { TestEditorView } from "@/components/tests/test-editor-view";

export default async function TeacherTestEditorPage({ params }: { params: Promise<{ id: string; versionId: string }> }) {
  const { id, versionId } = await params;
  const session = await auth();
  return <TestEditorView testId={id} versionId={versionId} basePath="/teacher/tests" canManage={canManageTests(session!.user.role)} />;
}
