import { NextResponse } from "next/server";
import { requireApiRole, apiErrorResponse } from "@/lib/api-auth";
import { getAttemptForTaking, AttemptNotFoundError } from "@/server/services/attemptsService";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireApiRole(["STUDENT"]);
    const { id } = await params;
    const attempt = await getAttemptForTaking(id, session.user.id);
    return NextResponse.json({ attempt });
  } catch (error) {
    if (error instanceof AttemptNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    return apiErrorResponse(error);
  }
}
