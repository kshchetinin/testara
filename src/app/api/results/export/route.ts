import { NextResponse } from "next/server";
import { requireApiRole, apiErrorResponse } from "@/lib/api-auth";
import { listResults } from "@/server/services/resultsService";
import { toCsv } from "@/lib/csv";

export async function GET(request: Request) {
  try {
    await requireApiRole(["ADMIN", "METHODIST", "TEACHER"]);
    const { searchParams } = new URL(request.url);
    const results = await listResults({
      groupId: searchParams.get("groupId") ?? undefined,
      testId: searchParams.get("testId") ?? undefined,
      studentSearch: searchParams.get("search") ?? undefined,
      dateFrom: searchParams.get("dateFrom") ?? undefined,
      dateTo: searchParams.get("dateTo") ?? undefined,
    });

    const csv = toCsv(
      ["ФИО", "Группа", "Тест", "Версия", "Попытка", "Балл", "Максимум", "Процент", "Время (сек)", "Дата завершения"],
      results.map((r) => [
        `${r.student.lastName} ${r.student.firstName} ${r.student.middleName ?? ""}`.trim(),
        r.student.group?.name ?? "",
        r.assignment.testVersion.test.title,
        r.assignment.testVersion.versionNumber,
        r.attemptNumber,
        r.score,
        r.maxScore,
        r.percentage,
        r.durationSeconds,
        r.completedAt ? new Date(r.completedAt).toLocaleString("ru-RU") : "",
      ])
    );

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="results-${Date.now()}.csv"`,
      },
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
