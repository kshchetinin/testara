import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiRole, apiErrorResponse } from "@/lib/api-auth";
import {
  getAssignmentDetail,
  setAssignmentStatus,
  deleteAssignment,
  ForbiddenAssignmentDeleteError,
  AssignmentHasAttemptsError,
} from "@/server/services/assignmentsService";

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

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireApiRole(["ADMIN", "METHODIST", "TEACHER"]);
    const { id } = await params;
    const deleted = await deleteAssignment(id, session.user.id, session.user.role === "ADMIN");
    if (!deleted) return NextResponse.json({ error: "Назначение не найдено" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof ForbiddenAssignmentDeleteError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof AssignmentHasAttemptsError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    return apiErrorResponse(error);
  }
}
