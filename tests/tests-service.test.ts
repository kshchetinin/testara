import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  createTest,
  replaceQuestions,
  publishVersion,
  createNewVersion,
  getVersionForEdit,
  TestVersionNotEditableError,
  EmptyTestVersionError,
} from "@/server/services/testsService";

describe("tests service — full version lifecycle", () => {
  let adminId: string;
  let testId: string;
  let versionId: string;

  beforeAll(async () => {
    const admin = await prisma.user.findFirstOrThrow({ where: { role: "ADMIN" } });
    adminId = admin.id;
  });

  afterAll(async () => {
    const test = await prisma.test.findFirst({ where: { title: "IT: Тест жизненного цикла" } });
    if (test) {
      const versions = await prisma.testVersion.findMany({ where: { testId: test.id } });
      const versionIds = versions.map((v) => v.id);
      const questions = await prisma.question.findMany({ where: { testVersionId: { in: versionIds } } });
      const questionIds = questions.map((q) => q.id);
      await prisma.answer.deleteMany({ where: { questionId: { in: questionIds } } });
      await prisma.question.deleteMany({ where: { testVersionId: { in: versionIds } } });
      await prisma.testVersion.deleteMany({ where: { testId: test.id } });
      await prisma.test.delete({ where: { id: test.id } });
    }
    await prisma.$disconnect();
  });

  it("creates a test with an initial draft version", async () => {
    const { test, version } = await createTest(
      { title: "IT: Тест жизненного цикла", subject: "Онкология", topic: "Интеграционный тест" },
      adminId
    );
    testId = test.id;
    versionId = version.id;
    expect(version.status).toBe("DRAFT");
    expect(version.versionNumber).toBe(1);
  });

  it("refuses to publish an empty version", async () => {
    await expect(publishVersion(versionId, adminId)).rejects.toBeInstanceOf(EmptyTestVersionError);
  });

  it("saves all four question types via replaceQuestions", async () => {
    const updated = await replaceQuestions(
      versionId,
      [
        {
          type: "SINGLE_CHOICE",
          text: "Один правильный ответ?",
          points: 1,
          answers: [
            { text: "Верно", isCorrect: true },
            { text: "Неверно", isCorrect: false },
          ],
        },
        {
          type: "MULTIPLE_CHOICE",
          text: "Несколько правильных ответов?",
          points: 2,
          scoringMode: "PARTIAL",
          answers: [
            { text: "А", isCorrect: true },
            { text: "Б", isCorrect: true },
            { text: "В", isCorrect: false },
          ],
        },
        {
          type: "TRUE_FALSE",
          text: "Верно или неверно?",
          points: 1,
          answers: [
            { text: "Верно", isCorrect: false },
            { text: "Неверно", isCorrect: true },
          ],
        },
        {
          type: "TEXT_ANSWER",
          text: "Текстовый вопрос?",
          points: 1,
          correctTextAnswers: ["ответ"],
        },
      ],
      adminId
    );

    expect(updated?.questions).toHaveLength(4);
    expect(updated?.questions.map((q) => q.type)).toEqual(["SINGLE_CHOICE", "MULTIPLE_CHOICE", "TRUE_FALSE", "TEXT_ANSWER"]);
    expect(updated?.questions[3].correctTextAnswers).toEqual(["ответ"]);
  });

  it("re-saves a draft that already has answers without a foreign-key violation", async () => {
    // Regression test: replaceQuestions must delete child Answer rows before deleting
    // their parent Question rows, or a second save on the same draft throws P2003.
    const resaved = await replaceQuestions(
      versionId,
      [
        {
          type: "SINGLE_CHOICE",
          text: "Отредактированный вопрос?",
          points: 3,
          answers: [
            { text: "Да", isCorrect: true },
            { text: "Нет", isCorrect: false },
          ],
        },
      ],
      adminId
    );
    expect(resaved?.questions).toHaveLength(1);
    expect(resaved?.questions[0].text).toBe("Отредактированный вопрос?");

    // restore the four questions the rest of the suite expects
    await replaceQuestions(
      versionId,
      [
        {
          type: "SINGLE_CHOICE",
          text: "Один правильный ответ?",
          points: 1,
          answers: [
            { text: "Верно", isCorrect: true },
            { text: "Неверно", isCorrect: false },
          ],
        },
        {
          type: "MULTIPLE_CHOICE",
          text: "Несколько правильных ответов?",
          points: 2,
          scoringMode: "PARTIAL",
          answers: [
            { text: "А", isCorrect: true },
            { text: "Б", isCorrect: true },
            { text: "В", isCorrect: false },
          ],
        },
        {
          type: "TRUE_FALSE",
          text: "Верно или неверно?",
          points: 1,
          answers: [
            { text: "Верно", isCorrect: false },
            { text: "Неверно", isCorrect: true },
          ],
        },
        {
          type: "TEXT_ANSWER",
          text: "Текстовый вопрос?",
          points: 1,
          correctTextAnswers: ["ответ"],
        },
      ],
      adminId
    );
  });

  it("publishes the version once it has questions", async () => {
    const published = await publishVersion(versionId, adminId);
    expect(published.status).toBe("PUBLISHED");
    expect(published.publishedAt).not.toBeNull();
  });

  it("refuses to edit questions on a published version", async () => {
    await expect(replaceQuestions(versionId, [], adminId)).rejects.toBeInstanceOf(TestVersionNotEditableError);
  });

  it("creates a new draft version cloning the published questions", async () => {
    const newVersion = await createNewVersion(testId, adminId);
    expect(newVersion.versionNumber).toBe(2);
    expect(newVersion.status).toBe("DRAFT");

    const full = await getVersionForEdit(newVersion.id);
    expect(full?.questions).toHaveLength(4);
    expect(full?.questions[1].answers.filter((a) => a.isCorrect)).toHaveLength(2);
  });

  it("is idempotent — calling createNewVersion again returns the same draft", async () => {
    const again = await createNewVersion(testId, adminId);
    const full = await getVersionForEdit(again.id);
    expect(full?.versionNumber).toBe(2);
  });

  it("keeps the original published version's questions untouched by later drafts", async () => {
    const originalVersion = await getVersionForEdit(versionId);
    expect(originalVersion?.questions).toHaveLength(4);
    expect(originalVersion?.status).toBe("PUBLISHED");
  });
});
