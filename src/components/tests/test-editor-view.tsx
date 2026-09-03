import { notFound } from "next/navigation";
import { QuestionEditor } from "./question-editor";
import { getVersionForEdit } from "@/server/services/testsService";

export async function TestEditorView({
  testId,
  versionId,
  basePath,
  canManage,
}: {
  testId: string;
  versionId: string;
  basePath: string;
  canManage: boolean;
}) {
  const version = await getVersionForEdit(versionId);
  if (!version || version.testId !== testId) notFound();

  return (
    <QuestionEditor
      testId={testId}
      versionId={versionId}
      testTitle={version.test.title}
      versionNumber={version.versionNumber}
      status={version.status}
      initialQuestions={version.questions}
      backHref={`${basePath}/${testId}`}
      readOnly={!canManage}
    />
  );
}
