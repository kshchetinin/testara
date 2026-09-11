import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiRole, apiErrorResponse } from "@/lib/api-auth";
import { setSubjectStatus, renameSubject } from "@/server/services/subjectsService";

const patchSchema = z.object({
  name: z.string().trim().min(1).optional(),
  status: z.enum(["ACTIVE", "ARCHIVED"]).optional(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireApiRole(["ADMIN"]);
    const { id } = await params;
    const body = patchSchema.parse(await request.json());
    let subject;
    if (body.name !== undefined) subject = await renameSubject(id, body.name, session.user.id);
    if (body.status !== undefined) subject = await setSubjectStatus(id, body.status, session.user.id);
    return NextResponse.json({ subject });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Неверные данные" }, { status: 400 });
    }
    return apiErrorResponse(error);
  }
}
