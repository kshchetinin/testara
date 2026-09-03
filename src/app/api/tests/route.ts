import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiRole, apiErrorResponse } from "@/lib/api-auth";
import { listTests, createTest } from "@/server/services/testsService";

export async function GET() {
  try {
    await requireApiRole(["ADMIN", "METHODIST", "TEACHER"]);
    const tests = await listTests();
    return NextResponse.json({ tests });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

const createSchema = z.object({
  title: z.string().trim().min(1, "Укажите название теста"),
  description: z.string().trim().optional(),
  subject: z.string().trim().min(1, "Укажите дисциплину"),
  topic: z.string().trim().optional(),
});

export async function POST(request: Request) {
  try {
    const session = await requireApiRole(["ADMIN", "METHODIST"]);
    const body = createSchema.parse(await request.json());
    const result = await createTest(body, session.user.id);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Неверные данные" }, { status: 400 });
    }
    return apiErrorResponse(error);
  }
}
