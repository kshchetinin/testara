import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { listGroups } from "@/server/services/groupsService";

export default async function TeacherGroupsPage() {
  const groups = await listGroups();

  return (
    <div>
      <PageHeader title="Группы" description="Учебные группы и их студенты" />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Название</TableHead>
            <TableHead>Статус</TableHead>
            <TableHead>Студентов</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {groups.map((group) => (
            <TableRow key={group.id}>
              <TableCell className="font-medium">
                <Link href={`/teacher/groups/${group.id}`} className="hover:underline">
                  {group.name}
                </Link>
              </TableCell>
              <TableCell>
                <Badge variant={group.status === "ACTIVE" ? "success" : "secondary"}>{group.status === "ACTIVE" ? "Активна" : "Архив"}</Badge>
              </TableCell>
              <TableCell>{group._count.students}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
