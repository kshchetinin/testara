import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getAttemptForTaking } from "@/server/services/attemptsService";
import { AttemptRunner } from "@/components/student/attempt-runner";

export default async function AttemptPage({ params }: { params: Promise<{ attemptId: string }> }) {
  const { attemptId } = await params;
  const session = await auth();
  const attempt = await getAttemptForTaking(attemptId, session!.user.id);

  if (attempt.status === "COMPLETED") redirect(`/student/result/${attemptId}`);
  if (attempt.status !== "IN_PROGRESS") redirect("/student?error=" + encodeURIComponent("Время на выполнение этой попытки истекло"));

  return (
    <AttemptRunner
      attempt={{
        id: attempt.id,
        status: attempt.status,
        deadline: attempt.deadline ? attempt.deadline.toISOString() : null,
        testTitle: attempt.testTitle,
        questions: attempt.questions,
      }}
    />
  );
}
