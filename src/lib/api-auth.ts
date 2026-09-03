import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { Prisma } from "@/generated/prisma/client";
import type { Role } from "@/generated/prisma/enums";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function requireApiRole(roles: Role[]) {
  const session = await auth();
  if (!session?.user) throw new ApiError(401, "Не авторизован");
  if (!roles.includes(session.user.role)) throw new ApiError(403, "Доступ запрещён");
  return session;
}

export function apiErrorResponse(error: unknown) {
  if (error instanceof ApiError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    return NextResponse.json({ error: "Запись с такими данными уже существует" }, { status: 409 });
  }
  console.error(error);
  return NextResponse.json({ error: "Внутренняя ошибка сервера" }, { status: 500 });
}
