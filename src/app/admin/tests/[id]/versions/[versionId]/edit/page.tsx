import { TestEditorView } from "@/components/tests/test-editor-view";

export default async function AdminTestEditorPage({ params }: { params: Promise<{ id: string; versionId: string }> }) {
  const { id, versionId } = await params;
  return <TestEditorView testId={id} versionId={versionId} basePath="/admin/tests" canManage />;
}
