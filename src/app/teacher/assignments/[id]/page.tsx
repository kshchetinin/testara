import { AssignmentDetailView } from "@/components/assignments/assignment-detail-view";

export default async function TeacherAssignmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AssignmentDetailView assignmentId={id} />;
}
