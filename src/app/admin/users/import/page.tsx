import { StudentImportWizard } from "@/components/shared/student-import-wizard";

export default function AdminStudentImportPage() {
  return <StudentImportWizard redirectPath="/admin/users" />;
}
