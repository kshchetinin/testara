import { TestsListView } from "@/components/tests/tests-list-view";

export default function AdminTestsPage() {
  return <TestsListView basePath="/admin/tests" canManage />;
}
