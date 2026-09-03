import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiRole, apiErrorResponse } from "@/lib/api-auth";
import { getOrCreateAttempt, AssignmentNotAvailableError, NoAttemptsLeftError } from "@/server/services/attemptsService";

const schema = z.object({ assignmentId: z.string().uuid() });

export async function POST(request: Request) {
  try {
    const session = await requireApiRole(["STUDENT"]);
    const body = schema.parse(await request.json());
    const attempt = await getOrCreateAttempt(body.assignmentId, session.user.id);
    return NextResponse.json({ attempt });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Неверные данные" }, { status: 400 });
    }
    if (error instanceof AssignmentNotAvailableError || error instanceof NoAttemptsLeftError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    return apiErrorResponse(error);
  }
}
