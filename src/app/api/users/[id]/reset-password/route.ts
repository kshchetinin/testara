import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiRole, apiErrorResponse } from "@/lib/api-auth";
import { resetPassword, generatePassword } from "@/server/services/usersService";

const schema = z.object({
  password: z.string().min(6).optional(),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireApiRole(["ADMIN"]);
    const { id } = await params;
    const body = schema.parse(await request.json().catch(() => ({})));
    const newPassword = body.password || generatePassword();
    await resetPassword(id, newPassword, session.user.id);
    return NextResponse.json({ password: newPassword });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Неверные данные" }, { status: 400 });
    }
    return apiErrorResponse(error);
  }
}
