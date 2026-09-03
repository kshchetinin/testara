"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Upload, ArrowRight, ArrowLeft, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";

interface Mapping {
  fullName: number | null;
  login: number | null;
  password: number | null;
  group: number | null;
}

interface Draft {
  rowIndex: number;
  fullName: string;
  lastName: string;
  firstName: string;
  middleName: string | null;
  login: string;
  password: string | null;
  groupName: string | null;
}

interface ValidationResult {
  rowIndex: number;
  draft: Draft;
  issues: { level: "error" | "warning"; message: string }[];
  existingUserId: string | null;
  groupExists: boolean;
}

type Action = "create" | "update" | "skip";

const FIELD_LABELS: Record<keyof Mapping, string> = {
  fullName: "ФИО",
  login: "Логин",
  password: "Пароль",
  group: "Группа",
};

export default function StudentImportPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [step, setStep] = React.useState<"upload" | "map" | "review" | "done">("upload");
  const [headers, setHeaders] = React.useState<string[]>([]);
  const [rows, setRows] = React.useState<string[][]>([]);
  const [mapping, setMapping] = React.useState<Mapping>({ fullName: null, login: null, password: null, group: null });
  const [results, setResults] = React.useState<ValidationResult[]>([]);
  const [actions, setActions] = React.useState<Record<number, Action>>({});
  const [busy, setBusy] = React.useState(false);
  const [report, setReport] = React.useState<{ created: number; updated: number; skipped: number; failed: { rowIndex: number; message: string }[] } | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  async function handleFileSelected(file: File) {
    setBusy(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/users/import/parse", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setHeaders(data.headers);
      setRows(data.rows);
      setMapping(data.mapping);
      setStep("map");
    } catch (err) {
      toast({ title: "Не удалось разобрать файл", description: (err as Error).message, variant: "error" });
    } finally {
      setBusy(false);
    }
  }

  async function runValidation() {
    setBusy(true);
    try {
      const res = await fetch("/api/users/import/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows, mapping }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResults(data.results);
      const defaultActions: Record<number, Action> = {};
      for (const r of data.results as ValidationResult[]) {
        const hasError = r.issues.some((i) => i.level === "error");
        defaultActions[r.rowIndex] = hasError ? "skip" : r.existingUserId ? "skip" : "create";
      }
      setActions(defaultActions);
      setStep("review");
    } catch (err) {
      toast({ title: "Не удалось проверить данные", description: (err as Error).message, variant: "error" });
    } finally {
      setBusy(false);
    }
  }

  async function commitImport() {
    setBusy(true);
    try {
      const payload = results.map((r) => ({ ...r.draft, action: actions[r.rowIndex] }));
      const res = await fetch("/api/users/import/commit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: payload }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setReport(data);
      setStep("done");
    } catch (err) {
      toast({ title: "Импорт не выполнен", description: (err as Error).message, variant: "error" });
    } finally {
      setBusy(false);
    }
  }

  const errorCount = results.filter((r) => r.issues.some((i) => i.level === "error")).length;
  const willImportCount = Object.values(actions).filter((a) => a !== "skip").length;

  return (
    <div>
      <PageHeader title="Импорт студентов из Excel" description="XLSX или CSV — ФИО, логин, пароль, группа" />

      {step === "upload" && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-4 p-12 text-center">
            <Upload className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Выберите файл со списком студентов. Ожидаются столбцы: ФИО, Логин, Пароль (необязательно), Группа.
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.csv"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFileSelected(e.target.files[0])}
            />
            <Button onClick={() => fileInputRef.current?.click()} disabled={busy}>
              {busy ? "Загрузка…" : "Выбрать файл"}
            </Button>
          </CardContent>
        </Card>
      )}

      {step === "map" && (
        <Card>
          <CardContent className="flex flex-col gap-6 p-6">
            <div>
              <h3 className="mb-3 text-sm font-medium">Сопоставление столбцов</h3>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                {(Object.keys(FIELD_LABELS) as (keyof Mapping)[]).map((field) => (
                  <div key={field} className="flex flex-col gap-1.5">
                    <label className="text-sm text-muted-foreground">{FIELD_LABELS[field]}</label>
                    <Select
                      value={mapping[field] ?? ""}
                      onChange={(e) => setMapping((m) => ({ ...m, [field]: e.target.value === "" ? null : Number(e.target.value) }))}
                    >
                      <option value="">Не указано</option>
                      {headers.map((h, i) => (
                        <option key={i} value={i}>
                          {h || `Столбец ${i + 1}`}
                        </option>
                      ))}
                    </Select>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="mb-3 text-sm font-medium">Предпросмотр ({rows.length} строк)</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ФИО</TableHead>
                    <TableHead>Логин</TableHead>
                    <TableHead>Пароль</TableHead>
                    <TableHead>Группа</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.slice(0, 5).map((row, i) => (
                    <TableRow key={i}>
                      <TableCell>{mapping.fullName !== null ? row[mapping.fullName] : "—"}</TableCell>
                      <TableCell>{mapping.login !== null ? row[mapping.login] : "—"}</TableCell>
                      <TableCell>{mapping.password !== null ? row[mapping.password] : "автоматически"}</TableCell>
                      <TableCell>{mapping.group !== null ? row[mapping.group] : "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep("upload")}>
                <ArrowLeft className="h-4 w-4" />
                Назад
              </Button>
              <Button onClick={runValidation} disabled={busy || mapping.fullName === null || mapping.login === null}>
                Проверить данные
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === "review" && (
        <Card>
          <CardContent className="flex flex-col gap-4 p-6">
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <Badge variant="secondary">{results.length} строк</Badge>
              {errorCount > 0 && <Badge variant="destructive">{errorCount} с ошибками</Badge>}
              <Badge variant="success">{willImportCount} будет импортировано</Badge>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Строка</TableHead>
                  <TableHead>ФИО</TableHead>
                  <TableHead>Логин</TableHead>
                  <TableHead>Группа</TableHead>
                  <TableHead>Проблемы</TableHead>
                  <TableHead>Действие</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.map((r) => {
                  const hasError = r.issues.some((i) => i.level === "error");
                  return (
                    <TableRow key={r.rowIndex}>
                      <TableCell>{r.rowIndex + 2}</TableCell>
                      <TableCell>{r.draft.fullName || "—"}</TableCell>
                      <TableCell>{r.draft.login || "—"}</TableCell>
                      <TableCell>{r.draft.groupName || "—"}</TableCell>
                      <TableCell>
                        {r.issues.length === 0 ? (
                          <span className="inline-flex items-center gap-1 text-success">
                            <CheckCircle2 className="h-4 w-4" /> Ок
                          </span>
                        ) : (
                          <div className="flex flex-col gap-1">
                            {r.issues.map((issue, idx) => (
                              <span
                                key={idx}
                                className={`inline-flex items-center gap-1 text-xs ${issue.level === "error" ? "text-destructive" : "text-warning"}`}
                              >
                                {issue.level === "error" ? <XCircle className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
                                {issue.message}
                              </span>
                            ))}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {hasError ? (
                          <span className="text-xs text-muted-foreground">Пропустить</span>
                        ) : (
                          <Select
                            className="h-8 text-xs"
                            value={actions[r.rowIndex]}
                            onChange={(e) => setActions((a) => ({ ...a, [r.rowIndex]: e.target.value as Action }))}
                          >
                            {r.existingUserId ? (
                              <>
                                <option value="skip">Пропустить</option>
                                <option value="update">Обновить существующего</option>
                              </>
                            ) : (
                              <>
                                <option value="create">Создать</option>
                                <option value="skip">Пропустить</option>
                              </>
                            )}
                          </Select>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep("map")}>
                <ArrowLeft className="h-4 w-4" />
                Назад
              </Button>
              <Button onClick={commitImport} disabled={busy || willImportCount === 0}>
                Импортировать {willImportCount} студентов
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === "done" && report && (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 p-12 text-center">
            <CheckCircle2 className="h-10 w-10 text-success" />
            <h3 className="text-lg font-semibold">Импорт завершён</h3>
            <div className="flex gap-4 text-sm">
              <Badge variant="success">Создано: {report.created}</Badge>
              <Badge variant="secondary">Обновлено: {report.updated}</Badge>
              <Badge variant="outline">Пропущено: {report.skipped}</Badge>
              {report.failed.length > 0 && <Badge variant="destructive">Ошибок: {report.failed.length}</Badge>}
            </div>
            {report.failed.length > 0 && (
              <ul className="text-left text-sm text-destructive">
                {report.failed.map((f, i) => (
                  <li key={i}>
                    Строка {f.rowIndex + 2}: {f.message}
                  </li>
                ))}
              </ul>
            )}
            <Button onClick={() => router.push("/admin/users")}>К списку пользователей</Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
