import { TestDetailView } from "@/components/tests/test-detail-view";

export default async function AdminTestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <TestDetailView testId={id} basePath="/admin/tests" canManage />;
}
