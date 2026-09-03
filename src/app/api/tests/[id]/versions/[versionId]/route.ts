import { NextResponse } from "next/server";
import { requireApiRole, apiErrorResponse } from "@/lib/api-auth";
import { getVersionForEdit } from "@/server/services/testsService";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string; versionId: string }> }) {
  try {
    await requireApiRole(["ADMIN", "METHODIST", "TEACHER"]);
    const { versionId } = await params;
    const version = await getVersionForEdit(versionId);
    if (!version) return NextResponse.json({ error: "Версия не найдена" }, { status: 404 });
    return NextResponse.json({ version });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
