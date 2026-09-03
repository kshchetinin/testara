import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiRole, apiErrorResponse } from "@/lib/api-auth";
import { saveAnswer, AttemptNotFoundError } from "@/server/services/attemptsService";

const schema = z.object({
  questionId: z.string().uuid(),
  selectedAnswerIds: z.array(z.string().uuid()).optional(),
  textAnswer: z.string().optional(),
});

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireApiRole(["STUDENT"]);
    const { id } = await params;
    const body = schema.parse(await request.json());
    const result = await saveAnswer(id, session.user.id, body);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Неверные данные" }, { status: 400 });
    }
    if (error instanceof AttemptNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    return apiErrorResponse(error);
  }
}
