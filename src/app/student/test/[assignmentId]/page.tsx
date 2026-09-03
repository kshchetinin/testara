import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getOrCreateAttempt, AssignmentNotAvailableError, NoAttemptsLeftError } from "@/server/services/attemptsService";

export default async function StartAssignmentPage({ params }: { params: Promise<{ assignmentId: string }> }) {
  const { assignmentId } = await params;
  const session = await auth();

  try {
    const attempt = await getOrCreateAttempt(assignmentId, session!.user.id);
    redirect(`/student/attempt/${attempt.id}`);
  } catch (error) {
    if (error instanceof AssignmentNotAvailableError || error instanceof NoAttemptsLeftError) {
      redirect(`/student?error=${encodeURIComponent(error.message)}`);
    }
    throw error;
  }
}
