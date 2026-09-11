import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiRole, apiErrorResponse } from "@/lib/api-auth";
import { listTests, createTest } from "@/server/services/testsService";
import { getUserSubjectIds } from "@/server/services/subjectsService";

export async function GET() {
  try {
    const session = await requireApiRole(["ADMIN", "METHODIST", "TEACHER"]);
    const subjectIds = session.user.role === "ADMIN" ? undefined : await getUserSubjectIds(session.user.id);
    const tests = await listTests({ subjectIds });
    return NextResponse.json({ tests });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

const createSchema = z.object({
  title: z.string().trim().min(1, "Укажите название теста"),
  description: z.string().trim().optional(),
  subjectId: z.string().uuid("Укажите дисциплину"),
  topic: z.string().trim().optional(),
});

export async function POST(request: Request) {
  try {
    const session = await requireApiRole(["ADMIN", "METHODIST"]);
    const body = createSchema.parse(await request.json());
    if (session.user.role !== "ADMIN") {
      const allowed = await getUserSubjectIds(session.user.id);
      if (!allowed.includes(body.subjectId)) {
        return NextResponse.json({ error: "Этот предмет вам не назначен" }, { status: 403 });
      }
    }
    const result = await createTest(body, session.user.id);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Неверные данные" }, { status: 400 });
    }
    return apiErrorResponse(error);
  }
}
