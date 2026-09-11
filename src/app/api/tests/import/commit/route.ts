import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiRole, apiErrorResponse } from "@/lib/api-auth";
import { createTestFromImport } from "@/server/services/testsService";
import { getUserSubjectIds } from "@/server/services/subjectsService";

const schema = z.object({
  title: z.string().trim().min(1, "Укажите название теста"),
  description: z.string().trim().optional(),
  subjectId: z.string().uuid("Укажите дисциплину"),
  topic: z.string().trim().optional(),
  questions: z
    .array(
      z.object({
        text: z.string().trim().min(1),
        answers: z.array(z.string().trim().min(1)).min(2),
        correctIndices: z.array(z.number().int().min(0)).min(1),
        type: z.enum(["SINGLE_CHOICE", "MULTIPLE_CHOICE"]),
      })
    )
    .min(1, "В файле нет корректных вопросов"),
});

export async function POST(request: Request) {
  try {
    const session = await requireApiRole(["ADMIN", "METHODIST"]);
    const body = schema.parse(await request.json());
    if (session.user.role !== "ADMIN") {
      const allowed = await getUserSubjectIds(session.user.id);
      if (!allowed.includes(body.subjectId)) {
        return NextResponse.json({ error: "Этот предмет вам не назначен" }, { status: 403 });
      }
    }
    const result = await createTestFromImport(body, body.questions, session.user.id);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Неверные данные" }, { status: 400 });
    }
    return apiErrorResponse(error);
  }
}
