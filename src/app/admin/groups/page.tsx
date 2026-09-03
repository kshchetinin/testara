import { PageHeader } from "@/components/shared/page-header";
import { GroupsTable } from "@/components/admin/groups-table";
import { listGroups } from "@/server/services/groupsService";

export default async function AdminGroupsPage() {
  const groups = await listGroups();

  return (
    <div>
      <PageHeader title="Группы" description="Справочник учебных групп" />
      <GroupsTable groups={groups} />
    </div>
  );
}
