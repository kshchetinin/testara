import { PageHeader } from "@/components/shared/page-header";
import { SubjectsTable } from "@/components/admin/subjects-table";
import { listSubjects } from "@/server/services/subjectsService";

export default async function AdminSubjectsPage() {
  const subjects = await listSubjects();

  return (
    <div>
      <PageHeader title="Предметы" description="Дисциплины/кафедры, к которым привязаны тесты и доступы преподавателей" />
      <SubjectsTable subjects={subjects} />
    </div>
  );
}
