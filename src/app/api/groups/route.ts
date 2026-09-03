import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiRole, apiErrorResponse } from "@/lib/api-auth";
import { listGroups, createGroup } from "@/server/services/groupsService";

export async function GET() {
  try {
    await requireApiRole(["ADMIN", "METHODIST", "TEACHER"]);
    const groups = await listGroups();
    return NextResponse.json({ groups });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

const createSchema = z.object({
  name: z.string().trim().min(1, "Укажите название группы").max(50),
});

export async function POST(request: Request) {
  try {
    const session = await requireApiRole(["ADMIN"]);
    const body = createSchema.parse(await request.json());
    const group = await createGroup(body.name, session.user.id);
    return NextResponse.json({ group }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Неверные данные" }, { status: 400 });
    }
    return apiErrorResponse(error);
  }
}
