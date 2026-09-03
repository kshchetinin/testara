import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ResultsFilterBar } from "./results-filter-bar";
import { ResultsActions } from "./results-actions";
import { listResults, type ResultsFilters } from "@/server/services/resultsService";
import { listGroups } from "@/server/services/groupsService";
import { listTests } from "@/server/services/testsService";

export async function ResultsListView({ basePath, filters }: { basePath: string; filters: ResultsFilters }) {
  const [results, groups, tests] = await Promise.all([listResults(filters), listGroups(), listTests()]);

  return (
    <div>
      <PageHeader title="Результаты тестирования" description={`Найдено: ${results.length}`} actions={<ResultsActions />} />

      <ResultsFilterBar
        groups={groups.filter((g) => g.status === "ACTIVE").map((g) => ({ id: g.id, name: g.name }))}
        tests={tests.map((t) => ({ id: t.id, name: t.title }))}
      />

      <div className="mb-4 hidden print:block">
        <h2 className="text-lg font-semibold">Сводный отчёт по результатам тестирования</h2>
        <p className="text-sm text-muted-foreground">Сформирован: {new Date().toLocaleString("ru-RU")}</p>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Студент</TableHead>
            <TableHead>Группа</TableHead>
            <TableHead>Тест</TableHead>
            <TableHead>Версия</TableHead>
            <TableHead>Результат</TableHead>
            <TableHead>Время</TableHead>
            <TableHead>Дата</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {results.length === 0 && (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-muted-foreground">
                Результатов не найдено
              </TableCell>
            </TableRow>
          )}
          {results.map((r) => (
            <TableRow key={r.id}>
              <TableCell className="font-medium">
                <Link href={`${basePath}/attempt/${r.id}`} className="hover:underline">
                  {r.student.lastName} {r.student.firstName}
                </Link>
              </TableCell>
              <TableCell>{r.student.group?.name ?? "—"}</TableCell>
              <TableCell>{r.assignment.testVersion.test.title}</TableCell>
              <TableCell>v{r.assignment.testVersion.versionNumber}</TableCell>
              <TableCell>
                <Badge variant={(r.percentage ?? 0) >= 60 ? "success" : "destructive"}>
                  {r.score}/{r.maxScore} ({r.percentage}%)
                </Badge>
              </TableCell>
              <TableCell>
                {r.durationSeconds !== null ? `${Math.floor(r.durationSeconds / 60)} мин ${r.durationSeconds % 60} сек` : "—"}
              </TableCell>
              <TableCell>{r.completedAt ? new Date(r.completedAt).toLocaleString("ru-RU") : "—"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
