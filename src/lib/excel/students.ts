export interface StudentColumnMapping {
  fullName: number | null;
  login: number | null;
  password: number | null;
  group: number | null;
}

const SYNONYMS: Record<keyof StudentColumnMapping, string[]> = {
  fullName: ["фио", "ф.и.о", "ф.и.о.", "студент", "фамилия имя отчество"],
  login: ["логин", "login", "username"],
  password: ["пароль", "password"],
  group: ["группа", "group"],
};

export function guessColumnMapping(headers: string[]): StudentColumnMapping {
  const normalized = headers.map((h) => h.trim().toLowerCase());
  const mapping: StudentColumnMapping = { fullName: null, login: null, password: null, group: null };

  for (const key of Object.keys(SYNONYMS) as (keyof StudentColumnMapping)[]) {
    const idx = normalized.findIndex((h) => SYNONYMS[key].some((s) => h.includes(s)));
    mapping[key] = idx >= 0 ? idx : null;
  }

  return mapping;
}

export function splitFullName(fullName: string): { lastName: string; firstName: string; middleName: string | null } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  return {
    lastName: parts[0] ?? "",
    firstName: parts[1] ?? "",
    middleName: parts.length > 2 ? parts.slice(2).join(" ") : null,
  };
}

export interface StudentRecordDraft {
  rowIndex: number;
  fullName: string;
  lastName: string;
  firstName: string;
  middleName: string | null;
  login: string;
  password: string | null;
  groupName: string | null;
}

export function buildStudentRecords(rows: string[][], mapping: StudentColumnMapping): StudentRecordDraft[] {
  return rows.map((row, rowIndex) => {
    const fullName = mapping.fullName !== null ? (row[mapping.fullName] ?? "").trim() : "";
    const { lastName, firstName, middleName } = splitFullName(fullName);
    return {
      rowIndex,
      fullName,
      lastName,
      firstName,
      middleName,
      login: mapping.login !== null ? (row[mapping.login] ?? "").trim() : "",
      password: mapping.password !== null ? (row[mapping.password] ?? "").trim() || null : null,
      groupName: mapping.group !== null ? (row[mapping.group] ?? "").trim() || null : null,
    };
  });
}
