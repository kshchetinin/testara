import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiRole, apiErrorResponse } from "@/lib/api-auth";
import { listUsers, createUser } from "@/server/services/usersService";
import type { Role, UserStatus } from "@/generated/prisma/enums";

export async function GET(request: Request) {
  try {
    await requireApiRole(["ADMIN"]);
    const { searchParams } = new URL(request.url);
    const role = searchParams.get("role") as Role | null;
    const status = searchParams.get("status") as UserStatus | null;
    const groupId = searchParams.get("groupId");
    const search = searchParams.get("search");
    const page = Number(searchParams.get("page") ?? "1") || 1;

    const result = await listUsers(
      {
        role: role ?? undefined,
        status: status ?? undefined,
        groupId: groupId ?? undefined,
        search: search ?? undefined,
      },
      page
    );
    return NextResponse.json(result);
  } catch (error) {
    return apiErrorResponse(error);
  }
}

const createSchema = z.object({
  login: z.string().trim().regex(/^[a-zA-Z0-9_.-]{3,32}$/, "Логин: латинские буквы, цифры, . _ -, от 3 до 32 символов"),
  password: z.string().min(6, "Минимум 6 символов"),
  firstName: z.string().trim().min(1, "Укажите имя"),
  lastName: z.string().trim().min(1, "Укажите фамилию"),
  middleName: z.string().trim().optional(),
  role: z.enum(["ADMIN", "METHODIST", "TEACHER", "STUDENT"]),
  groupId: z.string().uuid().optional().nullable(),
  subjectIds: z.array(z.string().uuid()).optional(),
});

export async function POST(request: Request) {
  try {
    const session = await requireApiRole(["ADMIN", "METHODIST"]);
    const body = createSchema.parse(await request.json());
    // METHODIST can only ever create students — the UI already locks the role
    // selector to STUDENT for them, but this is enforced here too since the
    // client-sent role can't be trusted on its own.
    if (session.user.role !== "ADMIN") body.role = "STUDENT";
    if ((body.role === "TEACHER" || body.role === "METHODIST") && !body.subjectIds?.length) {
      return NextResponse.json({ error: "Укажите хотя бы один предмет" }, { status: 400 });
    }
    const user = await createUser(body, session.user.id);
    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Неверные данные" }, { status: 400 });
    }
    return apiErrorResponse(error);
  }
}
