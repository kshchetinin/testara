import Link from "next/link";
import { Upload } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CreateTestDialog } from "./create-test-dialog";
import { listTests } from "@/server/services/testsService";
import { cn } from "@/lib/utils";

export async function TestsListView({
  basePath,
  canManage,
  subjectIds,
}: {
  basePath: string;
  canManage: boolean;
  subjectIds?: string[];
}) {
  const tests = await listTests({ subjectIds });

  return (
    <div>
      <PageHeader
        title="Тесты"
        description={`Всего: ${tests.length}`}
        actions={
          canManage ? (
            <>
              <Link href={`${basePath}/import`} className={cn(buttonVariants({ variant: "outline" }))}>
                <Upload className="h-4 w-4" />
                Импорт из Excel
              </Link>
              <CreateTestDialog basePath={basePath} />
            </>
          ) : undefined
        }
      />

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Название</TableHead>
            <TableHead>Дисциплина</TableHead>
            <TableHead>Автор</TableHead>
            <TableHead>Версии</TableHead>
            <TableHead>Статус</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tests.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground">
                Тестов пока нет
              </TableCell>
            </TableRow>
          )}
          {tests.map((test) => {
            const latest = test.versions[0];
            return (
              <TableRow key={test.id}>
                <TableCell className="font-medium">
                  <Link href={`${basePath}/${test.id}`} className="hover:underline">
                    {test.title}
                  </Link>
                </TableCell>
                <TableCell>{test.subject.name}</TableCell>
                <TableCell>
                  {test.author.lastName} {test.author.firstName}
                </TableCell>
                <TableCell>v{latest?.versionNumber ?? "—"}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Badge variant={latest?.status === "PUBLISHED" ? "success" : latest?.status === "DRAFT" ? "secondary" : "outline"}>
                      {latest?.status === "PUBLISHED" ? "Опубликован" : latest?.status === "DRAFT" ? "Черновик" : "Архив"}
                    </Badge>
                    {test.status === "ARCHIVED" && <Badge variant="outline">Тест в архиве</Badge>}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
