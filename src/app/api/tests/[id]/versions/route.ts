import { NextResponse } from "next/server";
import { requireApiRole, apiErrorResponse } from "@/lib/api-auth";
import { createNewVersion } from "@/server/services/testsService";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireApiRole(["ADMIN", "METHODIST"]);
    const { id } = await params;
    const version = await createNewVersion(id, session.user.id);
    return NextResponse.json({ version }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
