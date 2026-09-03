import { NextResponse } from "next/server";
import { requireApiRole, apiErrorResponse } from "@/lib/api-auth";
import { publishVersion, TestVersionNotEditableError, EmptyTestVersionError } from "@/server/services/testsService";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string; versionId: string }> }) {
  try {
    const session = await requireApiRole(["ADMIN", "METHODIST"]);
    const { versionId } = await params;
    const version = await publishVersion(versionId, session.user.id);
    return NextResponse.json({ version });
  } catch (error) {
    if (error instanceof TestVersionNotEditableError || error instanceof EmptyTestVersionError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    return apiErrorResponse(error);
  }
}
