import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiRole, apiErrorResponse } from "@/lib/api-auth";
import { replaceQuestions, TestVersionNotEditableError } from "@/server/services/testsService";

const answerSchema = z.object({ text: z.string().trim().min(1), isCorrect: z.boolean() });

const questionSchema = z
  .object({
    type: z.enum(["SINGLE_CHOICE", "MULTIPLE_CHOICE", "TRUE_FALSE", "TEXT_ANSWER"]),
    text: z.string().trim().min(1, "Текст вопроса обязателен"),
    explanation: z.string().trim().optional(),
    points: z.number().int().min(1).max(100),
    scoringMode: z.enum(["FULL_MATCH", "PARTIAL"]).optional(),
    correctTextAnswers: z.array(z.string().trim().min(1)).optional(),
    answers: z.array(answerSchema).optional(),
  })
  .superRefine((q, ctx) => {
    if (q.type === "TEXT_ANSWER") {
      if (!q.correctTextAnswers || q.correctTextAnswers.length === 0) {
        ctx.addIssue({ code: "custom", message: "Укажите хотя бы один допустимый ответ" });
      }
      return;
    }
    const answers = q.answers ?? [];
    if (answers.length < 2) {
      ctx.addIssue({ code: "custom", message: "Нужно минимум 2 варианта ответа" });
    }
    const correctCount = answers.filter((a) => a.isCorrect).length;
    if ((q.type === "SINGLE_CHOICE" || q.type === "TRUE_FALSE") && correctCount !== 1) {
      ctx.addIssue({ code: "custom", message: "Отметьте ровно один правильный вариант" });
    }
    if (q.type === "MULTIPLE_CHOICE" && correctCount < 1) {
      ctx.addIssue({ code: "custom", message: "Отметьте хотя бы один правильный вариант" });
    }
  });

const bodySchema = z.object({ questions: z.array(questionSchema) });

export async function PUT(request: Request, { params }: { params: Promise<{ id: string; versionId: string }> }) {
  try {
    const session = await requireApiRole(["ADMIN", "METHODIST"]);
    const { versionId } = await params;
    const body = bodySchema.parse(await request.json());
    const version = await replaceQuestions(versionId, body.questions, session.user.id);
    return NextResponse.json({ version });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const first = error.issues[0];
      const rowInfo = first?.path.length ? ` (вопрос ${Number(first.path[1]) + 1})` : "";
      return NextResponse.json({ error: `${first?.message ?? "Неверные данные"}${rowInfo}` }, { status: 400 });
    }
    if (error instanceof TestVersionNotEditableError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    return apiErrorResponse(error);
  }
}
