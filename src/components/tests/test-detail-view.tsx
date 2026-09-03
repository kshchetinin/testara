import { notFound } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { TestDetailPanel } from "./test-detail-panel";
import { getTestWithVersions } from "@/server/services/testsService";

export async function TestDetailView({ testId, basePath, canManage }: { testId: string; basePath: string; canManage: boolean }) {
  const test = await getTestWithVersions(testId);
  if (!test) notFound();

  return (
    <div>
      <PageHeader title={test.title} description={test.topic ? `${test.subject} · ${test.topic}` : test.subject} />
      <TestDetailPanel test={test} basePath={basePath} canManage={canManage} />
    </div>
  );
}
