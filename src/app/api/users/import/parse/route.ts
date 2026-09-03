import { NextResponse } from "next/server";
import { requireApiRole, apiErrorResponse } from "@/lib/api-auth";
import { parseSpreadsheet } from "@/lib/excel/parse-workbook";
import { guessColumnMapping } from "@/lib/excel/students";

export async function POST(request: Request) {
  try {
    await requireApiRole(["ADMIN"]);
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Файл не найден" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const { headers, rows } = await parseSpreadsheet(buffer, file.name);
    const mapping = guessColumnMapping(headers);

    return NextResponse.json({ headers, rows, mapping });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
