import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiRole, apiErrorResponse } from "@/lib/api-auth";
import { getTestWithVersions, updateTest } from "@/server/services/testsService";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireApiRole(["ADMIN", "METHODIST", "TEACHER"]);
    const { id } = await params;
    const test = await getTestWithVersions(id);
    if (!test) return NextResponse.json({ error: "Тест не найден" }, { status: 404 });
    return NextResponse.json({ test });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

const patchSchema = z.object({
  title: z.string().trim().min(1).optional(),
  description: z.string().trim().optional().nullable(),
  subject: z.string().trim().min(1).optional(),
  topic: z.string().trim().optional().nullable(),
  status: z.enum(["ACTIVE", "ARCHIVED"]).optional(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireApiRole(["ADMIN", "METHODIST"]);
    const { id } = await params;
    const body = patchSchema.parse(await request.json());
    const test = await updateTest(id, body, session.user.id);
    return NextResponse.json({ test });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Неверные данные" }, { status: 400 });
    }
    return apiErrorResponse(error);
  }
}
