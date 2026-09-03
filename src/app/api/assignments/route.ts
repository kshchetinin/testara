import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiRole, apiErrorResponse } from "@/lib/api-auth";
import { listAssignments, createAssignment, TestVersionNotPublishedError, InvalidQuestionCountError } from "@/server/services/assignmentsService";

export async function GET(request: Request) {
  try {
    const session = await requireApiRole(["ADMIN", "METHODIST", "TEACHER"]);
    const { searchParams } = new URL(request.url);
    const onlyMine = searchParams.get("onlyMine") === "1";
    const status = searchParams.get("status");
    const assignments = await listAssignments({
      createdById: onlyMine ? session.user.id : undefined,
      status: status === "ACTIVE" || status === "CLOSED" ? status : undefined,
      groupId: searchParams.get("groupId") ?? undefined,
      topic: searchParams.get("topic") ?? undefined,
    });
    return NextResponse.json({ assignments });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

const createSchema = z
  .object({
    testVersionId: z.string().uuid(),
    title: z.string().trim().optional(),
    groupIds: z.array(z.string().uuid()).default([]),
    studentIds: z.array(z.string().uuid()).default([]),
    availableFrom: z.string().datetime().optional().nullable(),
    availableUntil: z.string().datetime().optional().nullable(),
    timeLimitMinutes: z.number().int().min(1).max(600).optional().nullable(),
    attemptsAllowed: z.number().int().min(1).max(20),
    questionCount: z.number().int().min(1).optional().nullable(),
    randomizeQuestions: z.boolean(),
    randomizeAnswers: z.boolean(),
    showResult: z.boolean(),
    showCorrectAnswers: z.boolean(),
    allowResume: z.boolean(),
  })
  .refine((data) => data.groupIds.length > 0 || data.studentIds.length > 0, {
    message: "Выберите хотя бы одну группу или студента",
    path: ["groupIds"],
  });

export async function POST(request: Request) {
  try {
    const session = await requireApiRole(["ADMIN", "METHODIST", "TEACHER"]);
    const body = createSchema.parse(await request.json());
    const assignment = await createAssignment(
      {
        ...body,
        availableFrom: body.availableFrom ? new Date(body.availableFrom) : null,
        availableUntil: body.availableUntil ? new Date(body.availableUntil) : null,
      },
      session.user.id
    );
    return NextResponse.json({ assignment }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Неверные данные" }, { status: 400 });
    }
    if (error instanceof TestVersionNotPublishedError || error instanceof InvalidQuestionCountError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    return apiErrorResponse(error);
  }
}
