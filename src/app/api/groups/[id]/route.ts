import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiRole, apiErrorResponse } from "@/lib/api-auth";
import { renameGroup, setGroupStatus, getGroupWithStats } from "@/server/services/groupsService";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireApiRole(["ADMIN", "METHODIST", "TEACHER"]);
    const { id } = await params;
    const result = await getGroupWithStats(id);
    if (!result) return NextResponse.json({ error: "Группа не найдена" }, { status: 404 });
    return NextResponse.json(result);
  } catch (error) {
    return apiErrorResponse(error);
  }
}

const patchSchema = z.object({
  name: z.string().trim().min(1).max(50).optional(),
  status: z.enum(["ACTIVE", "ARCHIVED"]).optional(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireApiRole(["ADMIN"]);
    const { id } = await params;
    const body = patchSchema.parse(await request.json());

    let group = null;
    if (body.name !== undefined) {
      group = await renameGroup(id, body.name, session.user.id);
    }
    if (body.status !== undefined) {
      group = await setGroupStatus(id, body.status, session.user.id);
    }
    return NextResponse.json({ group });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Неверные данные" }, { status: 400 });
    }
    return apiErrorResponse(error);
  }
}
