import { ResultsListView } from "@/components/results/results-list-view";

export default async function AdminResultsPage({
  searchParams,
}: {
  searchParams: Promise<{ groupId?: string; testId?: string; search?: string; dateFrom?: string; dateTo?: string }>;
}) {
  const sp = await searchParams;
  return (
    <ResultsListView
      basePath="/admin/results"
      filters={{ groupId: sp.groupId, testId: sp.testId, studentSearch: sp.search, dateFrom: sp.dateFrom, dateTo: sp.dateTo }}
    />
  );
}
