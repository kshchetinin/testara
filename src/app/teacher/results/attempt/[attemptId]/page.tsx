import { AttemptDetailView } from "@/components/results/attempt-detail-view";

export default async function TeacherAttemptDetailPage({ params }: { params: Promise<{ attemptId: string }> }) {
  const { attemptId } = await params;
  return <AttemptDetailView attemptId={attemptId} basePath="/teacher/results" />;
}
