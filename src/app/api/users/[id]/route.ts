import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiRole, apiErrorResponse } from "@/lib/api-auth";
import { getUserDetail, updateUser, setUserStatus } from "@/server/services/usersService";
import { prisma } from "@/lib/prisma";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireApiRole(["ADMIN"]);
    const { id } = await params;
    const result = await getUserDetail(id);
    if (!result) return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 });
    return NextResponse.json(result);
  } catch (error) {
    return apiErrorResponse(error);
  }
}

const patchSchema = z.object({
  firstName: z.string().trim().min(1).optional(),
  lastName: z.string().trim().min(1).optional(),
  middleName: z.string().trim().optional().nullable(),
  groupId: z.string().uuid().optional().nullable(),
  subjectIds: z.array(z.string().uuid()).optional(),
  status: z.enum(["ACTIVE", "BLOCKED", "ARCHIVED"]).optional(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireApiRole(["ADMIN"]);
    const { id } = await params;
    const body = patchSchema.parse(await request.json());

    if (body.subjectIds !== undefined && body.subjectIds.length === 0) {
      const target = await prisma.user.findUnique({ where: { id }, select: { role: true } });
      if (target && (target.role === "TEACHER" || target.role === "METHODIST")) {
        return NextResponse.json({ error: "Укажите хотя бы один предмет" }, { status: 400 });
      }
    }

    let user = null;
    const { status, ...rest } = body;
    if (Object.keys(rest).length > 0) {
      user = await updateUser(id, rest, session.user.id);
    }
    if (status) {
      user = await setUserStatus(id, status, session.user.id);
    }
    return NextResponse.json({ user });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Неверные данные" }, { status: 400 });
    }
    return apiErrorResponse(error);
  }
}
