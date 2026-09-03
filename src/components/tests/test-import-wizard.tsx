"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Upload, ArrowRight, ArrowLeft, CheckCircle2, XCircle } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { buildQuestionRecords, validateQuestionRecord, type TestColumnMapping, type QuestionRecordDraft } from "@/lib/excel/tests";

export function TestImportWizard({ basePath }: { basePath: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [step, setStep] = React.useState<"upload" | "map" | "review">("upload");
  const [headers, setHeaders] = React.useState<string[]>([]);
  const [rows, setRows] = React.useState<string[][]>([]);
  const [mapping, setMapping] = React.useState<TestColumnMapping>({ question: null, answers: [], correct: null });
  const [meta, setMeta] = React.useState({ title: "", subject: "Онкология", topic: "" });
  const [busy, setBusy] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const records: QuestionRecordDraft[] = React.useMemo(() => buildQuestionRecords(rows, mapping), [rows, mapping]);
  const validated = React.useMemo(() => records.map((r) => ({ record: r, issues: validateQuestionRecord(r) })), [records]);
  const validCount = validated.filter((v) => v.issues.length === 0).length;

  async function handleFileSelected(file: File) {
    setBusy(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/tests/import/parse", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setHeaders(data.headers);
      setRows(data.rows);
      setMapping(data.mapping);
      if (!meta.title) setMeta((m) => ({ ...m, title: file.name.replace(/\.(xlsx|csv)$/i, "") }));
      setStep("map");
    } catch (err) {
      toast({ title: "Не удалось разобрать файл", description: (err as Error).message, variant: "error" });
    } finally {
      setBusy(false);
    }
  }

  function toggleAnswerColumn(colIndex: number) {
    setMapping((m) => ({
      ...m,
      answers: m.answers.includes(colIndex) ? m.answers.filter((c) => c !== colIndex) : [...m.answers, colIndex].sort((a, b) => a - b),
    }));
  }

  async function commitImport() {
    setBusy(true);
    try {
      const payload = {
        ...meta,
        questions: validated
          .filter((v) => v.issues.length === 0)
          .map((v) => ({ text: v.record.text, answers: v.record.answers, correctIndices: v.record.correctIndices, type: v.record.type })),
      };
      const res = await fetch("/api/tests/import/commit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast({ title: "Тест импортирован", description: `Создано вопросов: ${payload.questions.length}`, variant: "success" });
      router.push(`${basePath}/${data.test.id}`);
    } catch (err) {
      toast({ title: "Импорт не выполнен", description: (err as Error).message, variant: "error" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader title="Импорт теста из Excel" description="XLSX или CSV — вопрос, варианты ответов, правильный ответ" />

      {step === "upload" && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-4 p-12 text-center">
            <Upload className="h-10 w-10 text-muted-foreground" />
            <p className="max-w-md text-sm text-muted-foreground">
              Ожидаются столбцы: Вопрос, Вариант 1…N, Правильный ответ (номер, буква или текст варианта; несколько значений через
              запятую — для вопроса с несколькими правильными ответами).
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
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="flex flex-col gap-1.5">
                <Label>Название теста</Label>
                <Input value={meta.title} onChange={(e) => setMeta((m) => ({ ...m, title: e.target.value }))} required />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Дисциплина</Label>
                <Input value={meta.subject} onChange={(e) => setMeta((m) => ({ ...m, subject: e.target.value }))} required />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Тема</Label>
                <Input value={meta.topic} onChange={(e) => setMeta((m) => ({ ...m, topic: e.target.value }))} />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label>Столбец с вопросом</Label>
                <Select
                  value={mapping.question ?? ""}
                  onChange={(e) => setMapping((m) => ({ ...m, question: e.target.value === "" ? null : Number(e.target.value) }))}
                >
                  <option value="">Не указано</option>
                  {headers.map((h, i) => (
                    <option key={i} value={i}>
                      {h || `Столбец ${i + 1}`}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Столбец с правильным ответом</Label>
                <Select
                  value={mapping.correct ?? ""}
                  onChange={(e) => setMapping((m) => ({ ...m, correct: e.target.value === "" ? null : Number(e.target.value) }))}
                >
                  <option value="">Не указано</option>
                  {headers.map((h, i) => (
                    <option key={i} value={i}>
                      {h || `Столбец ${i + 1}`}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            <div>
              <Label>Столбцы с вариантами ответа</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {headers.map((h, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => toggleAnswerColumn(i)}
                    className={`rounded-full border px-3 py-1 text-xs ${
                      mapping.answers.includes(i) ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground"
                    }`}
                  >
                    {h || `Столбец ${i + 1}`}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep("upload")}>
                <ArrowLeft className="h-4 w-4" />
                Назад
              </Button>
              <Button onClick={() => setStep("review")} disabled={mapping.question === null || mapping.answers.length === 0 || !meta.title}>
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
              <Badge variant="secondary">{validated.length} строк</Badge>
              <Badge variant="success">{validCount} будет импортировано</Badge>
              {validCount < validated.length && <Badge variant="destructive">{validated.length - validCount} с ошибками (пропущены)</Badge>}
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Строка</TableHead>
                  <TableHead>Вопрос</TableHead>
                  <TableHead>Тип</TableHead>
                  <TableHead>Вариантов</TableHead>
                  <TableHead>Проблемы</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {validated.map(({ record, issues }) => (
                  <TableRow key={record.rowIndex}>
                    <TableCell>{record.rowIndex + 2}</TableCell>
                    <TableCell className="max-w-xs truncate">{record.text || "—"}</TableCell>
                    <TableCell>{record.type === "MULTIPLE_CHOICE" ? "Неск. ответов" : "Один ответ"}</TableCell>
                    <TableCell>{record.answers.length}</TableCell>
                    <TableCell>
                      {issues.length === 0 ? (
                        <span className="inline-flex items-center gap-1 text-success">
                          <CheckCircle2 className="h-4 w-4" /> Ок
                        </span>
                      ) : (
                        <div className="flex flex-col gap-1">
                          {issues.map((issue, idx) => (
                            <span key={idx} className="inline-flex items-center gap-1 text-xs text-destructive">
                              <XCircle className="h-3.5 w-3.5" />
                              {issue.message}
                            </span>
                          ))}
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep("map")}>
                <ArrowLeft className="h-4 w-4" />
                Назад
              </Button>
              <Button onClick={commitImport} disabled={busy || validCount === 0}>
                Импортировать {validCount} вопросов
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
