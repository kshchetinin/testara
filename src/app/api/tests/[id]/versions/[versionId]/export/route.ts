import { NextResponse } from "next/server";
import { requireApiRole, apiErrorResponse } from "@/lib/api-auth";
import { getVersionForEdit } from "@/server/services/testsService";
import { buildTestWorkbook } from "@/lib/excel/export-test";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string; versionId: string }> }) {
  try {
    await requireApiRole(["ADMIN", "METHODIST", "TEACHER"]);
    const { versionId } = await params;
    const version = await getVersionForEdit(versionId);
    if (!version) return NextResponse.json({ error: "Версия не найдена" }, { status: 404 });

    const workbook = await buildTestWorkbook(
      version.test.title,
      version.questions.map((q) => ({
        order: q.order,
        type: q.type,
        text: q.text,
        points: q.points,
        answers: q.answers.map((a) => ({ text: a.text, isCorrect: a.isCorrect })),
        correctTextAnswers: q.correctTextAnswers,
      }))
    );

    const buffer = await workbook.xlsx.writeBuffer();
    const filename = encodeURIComponent(`${version.test.title} v${version.versionNumber}.xlsx`);

    return new NextResponse(buffer as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="test.xlsx"; filename*=UTF-8''${filename}`,
      },
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
