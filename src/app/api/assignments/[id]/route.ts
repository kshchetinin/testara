import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiRole, apiErrorResponse } from "@/lib/api-auth";
import { getAssignmentDetail, setAssignmentStatus } from "@/server/services/assignmentsService";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireApiRole(["ADMIN", "METHODIST", "TEACHER"]);
    const { id } = await params;
    const assignment = await getAssignmentDetail(id);
    if (!assignment) return NextResponse.json({ error: "Назначение не найдено" }, { status: 404 });
    return NextResponse.json({ assignment });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

const patchSchema = z.object({ status: z.enum(["ACTIVE", "CLOSED"]) });

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireApiRole(["ADMIN", "METHODIST", "TEACHER"]);
    const { id } = await params;
    const body = patchSchema.parse(await request.json());
    const assignment = await setAssignmentStatus(id, body.status, session.user.id);
    return NextResponse.json({ assignment });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Неверные данные" }, { status: 400 });
    }
    return apiErrorResponse(error);
  }
}
