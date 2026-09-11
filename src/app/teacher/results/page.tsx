import { ResultsListView } from "@/components/results/results-list-view";
import { auth } from "@/lib/auth";
import { getUserSubjectIds } from "@/server/services/subjectsService";

export default async function TeacherResultsPage({
  searchParams,
}: {
  searchParams: Promise<{ groupId?: string; testId?: string; search?: string; dateFrom?: string; dateTo?: string }>;
}) {
  const [sp, session] = await Promise.all([searchParams, auth()]);
  const subjectIds = await getUserSubjectIds(session!.user.id);
  return (
    <ResultsListView
      basePath="/teacher/results"
      filters={{ groupId: sp.groupId, testId: sp.testId, studentSearch: sp.search, dateFrom: sp.dateFrom, dateTo: sp.dateTo, subjectIds }}
    />
  );
}
