import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiRole, apiErrorResponse } from "@/lib/api-auth";
import { listSubjects, listSubjectsForUser, createSubject } from "@/server/services/subjectsService";

export async function GET(request: Request) {
  try {
    const session = await requireApiRole(["ADMIN", "METHODIST", "TEACHER"]);
    const { searchParams } = new URL(request.url);
    const subjects =
      searchParams.get("mine") === "1"
        ? await listSubjectsForUser(session.user.id, session.user.role)
        : await listSubjects();
    return NextResponse.json({ subjects });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

const createSchema = z.object({
  name: z.string().trim().min(1, "Укажите название предмета"),
});

export async function POST(request: Request) {
  try {
    const session = await requireApiRole(["ADMIN"]);
    const body = createSchema.parse(await request.json());
    const subject = await createSubject(body.name, session.user.id);
    return NextResponse.json({ subject }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Неверные данные" }, { status: 400 });
    }
    return apiErrorResponse(error);
  }
}
