function escapeCsvCell(value: string): string {
  if (/[",\n;]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function toCsv(headers: string[], rows: (string | number | null | undefined)[][]): string {
  const lines = [headers.map(escapeCsvCell).join(";")];
  for (const row of rows) {
    lines.push(row.map((cell) => escapeCsvCell(cell === null || cell === undefined ? "" : String(cell))).join(";"));
  }
  return "﻿" + lines.join("\r\n");
}
