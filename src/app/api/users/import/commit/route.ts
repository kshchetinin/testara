import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiRole, apiErrorResponse } from "@/lib/api-auth";
import { commitStudentImport } from "@/server/services/usersImportService";

const schema = z.object({
  rows: z.array(
    z.object({
      rowIndex: z.number(),
      fullName: z.string(),
      lastName: z.string(),
      firstName: z.string(),
      middleName: z.string().nullable(),
      login: z.string(),
      password: z.string().nullable(),
      groupName: z.string().nullable(),
      action: z.enum(["create", "update", "skip"]),
    })
  ),
});

export async function POST(request: Request) {
  try {
    const session = await requireApiRole(["ADMIN"]);
    const body = schema.parse(await request.json());
    const report = await commitStudentImport(body.rows, session.user.id);
    return NextResponse.json(report);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Неверный формат данных" }, { status: 400 });
    }
    return apiErrorResponse(error);
  }
}
