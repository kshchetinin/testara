import { notFound } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { TestDetailPanel } from "./test-detail-panel";
import { getTestWithVersions } from "@/server/services/testsService";
import { auth } from "@/lib/auth";
import { getUserSubjectIds } from "@/server/services/subjectsService";

export async function TestDetailView({ testId, basePath, canManage }: { testId: string; basePath: string; canManage: boolean }) {
  const test = await getTestWithVersions(testId);
  if (!test) notFound();

  const session = await auth();
  if (session!.user.role !== "ADMIN") {
    const allowed = await getUserSubjectIds(session!.user.id);
    if (!allowed.includes(test.subjectId)) notFound();
  }

  return (
    <div>
      <PageHeader title={test.title} description={test.topic ? `${test.subject.name} · ${test.topic}` : test.subject.name} />
      <TestDetailPanel test={test} basePath={basePath} canManage={canManage} />
    </div>
  );
}
