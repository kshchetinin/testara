import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiRole, apiErrorResponse } from "@/lib/api-auth";
import { buildStudentRecords } from "@/lib/excel/students";
import { validateStudentImport } from "@/server/services/usersImportService";

const schema = z.object({
  rows: z.array(z.array(z.string())),
  mapping: z.object({
    fullName: z.number().nullable(),
    login: z.number().nullable(),
    password: z.number().nullable(),
    group: z.number().nullable(),
  }),
});

export async function POST(request: Request) {
  try {
    await requireApiRole(["ADMIN", "METHODIST"]);
    const body = schema.parse(await request.json());
    const drafts = buildStudentRecords(body.rows, body.mapping);
    const results = await validateStudentImport(drafts);
    return NextResponse.json({ results });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Неверный формат данных" }, { status: 400 });
    }
    return apiErrorResponse(error);
  }
}
