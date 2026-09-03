import { AssignmentsListView } from "@/components/assignments/assignments-list-view";
import { auth } from "@/lib/auth";

export default async function TeacherAssignmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ onlyMine?: string; status?: string; groupId?: string; topic?: string }>;
}) {
  const [session, sp] = await Promise.all([auth(), searchParams]);
  return (
    <AssignmentsListView
      basePath="/teacher/assignments"
      filters={{
        createdById: sp.onlyMine === "1" ? session!.user.id : undefined,
        status: sp.status === "ACTIVE" || sp.status === "CLOSED" ? sp.status : undefined,
        groupId: sp.groupId || undefined,
        topic: sp.topic || undefined,
      }}
    />
  );
}
