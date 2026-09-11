import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function hash(password: string) {
  return bcrypt.hash(password, 10);
}

async function main() {
  console.log("Seeding database...");

  const admin = await prisma.user.upsert({
    where: { login: "admin" },
    update: {},
    create: {
      login: "admin",
      passwordHash: await hash("admin123"),
      firstName: "Админ",
      lastName: "Системы",
      role: "ADMIN",
      status: "ACTIVE",
    },
  });

  const subject = await prisma.subject.upsert({
    where: { name: "Онкология" },
    update: {},
    create: { name: "Онкология", status: "ACTIVE" },
  });

  const methodist = await prisma.user.upsert({
    where: { login: "demo_methodist" },
    update: {},
    create: {
      login: "demo_methodist",
      passwordHash: await hash("methodist123"),
      firstName: "Ольга",
      lastName: "Кузнецова",
      middleName: "Викторовна",
      role: "METHODIST",
      status: "ACTIVE",
      subjects: { connect: [{ id: subject.id }] },
    },
  });

  const teacher = await prisma.user.upsert({
    where: { login: "demo_teacher" },
    update: {},
    create: {
      login: "demo_teacher",
      passwordHash: await hash("teacher123"),
      firstName: "Игорь",
      lastName: "Соколов",
      middleName: "Петрович",
      role: "TEACHER",
      status: "ACTIVE",
      subjects: { connect: [{ id: subject.id }] },
    },
  });

  const group401 = await prisma.group.upsert({
    where: { name: "401" },
    update: {},
    create: { name: "401", status: "ACTIVE" },
  });

  const group402 = await prisma.group.upsert({
    where: { name: "402" },
    update: {},
    create: { name: "402", status: "ACTIVE" },
  });

  const studentsData = [
    { login: "ivanov1", firstName: "Иван", lastName: "Иванов", middleName: "Иванович", groupId: group401.id },
    { login: "petrov2", firstName: "Пётр", lastName: "Петров", middleName: "Петрович", groupId: group401.id },
    { login: "sidorova3", firstName: "Анна", lastName: "Сидорова", middleName: "Сергеевна", groupId: group401.id },
    { login: "kozlova4", firstName: "Мария", lastName: "Козлова", middleName: "Андреевна", groupId: group401.id },
    { login: "novikov5", firstName: "Дмитрий", lastName: "Новиков", middleName: "Олегович", groupId: group402.id },
    { login: "fedorova6", firstName: "Елена", lastName: "Фёдорова", middleName: "Игоревна", groupId: group402.id },
  ];

  const students = [];
  for (const s of studentsData) {
    const student = await prisma.user.upsert({
      where: { login: s.login },
      update: {},
      create: {
        login: s.login,
        passwordHash: await hash("student123"),
        firstName: s.firstName,
        lastName: s.lastName,
        middleName: s.middleName,
        role: "STUDENT",
        status: "ACTIVE",
        groupId: s.groupId,
      },
    });
    students.push(student);
  }

  const existingTest = await prisma.test.findFirst({ where: { title: "Основы онкологии" } });
  const test =
    existingTest ??
    (await prisma.test.create({
      data: {
        title: "Основы онкологии",
        description: "Демонстрационный тест по основным понятиям онкологии для учебных занятий.",
        subjectId: subject.id,
        topic: "Общие вопросы",
        authorId: methodist.id,
        status: "ACTIVE",
      },
    }));

  const existingVersion = await prisma.testVersion.findFirst({ where: { testId: test.id } });

  const version =
    existingVersion ??
    (await prisma.testVersion.create({
      data: {
        testId: test.id,
        versionNumber: 1,
        status: "PUBLISHED",
        createdById: methodist.id,
        publishedAt: new Date(),
        questions: {
          create: [
            {
              type: "SINGLE_CHOICE",
              text: "Как называется раздел медицины, изучающий опухолевые заболевания?",
              points: 1,
              order: 1,
              answers: {
                create: [
                  { text: "Онкология", isCorrect: true, order: 1 },
                  { text: "Кардиология", isCorrect: false, order: 2 },
                  { text: "Неврология", isCorrect: false, order: 3 },
                  { text: "Гастроэнтерология", isCorrect: false, order: 4 },
                ],
              },
            },
            {
              type: "SINGLE_CHOICE",
              text: "Какой основной признак отличает злокачественную опухоль от доброкачественной?",
              points: 1,
              order: 2,
              answers: {
                create: [
                  { text: "Медленный рост без прорастания в соседние ткани", isCorrect: false, order: 1 },
                  { text: "Способность к инвазивному росту и метастазированию", isCorrect: true, order: 2 },
                  { text: "Наличие капсулы", isCorrect: false, order: 3 },
                  { text: "Отсутствие клеточного деления", isCorrect: false, order: 4 },
                ],
              },
            },
            {
              type: "TRUE_FALSE",
              text: "Доброкачественные опухоли никогда не рецидивируют после удаления.",
              explanation: "Доброкачественные опухоли могут рецидивировать, хотя и реже злокачественных.",
              points: 1,
              order: 3,
              answers: {
                create: [
                  { text: "Верно", isCorrect: false, order: 1 },
                  { text: "Неверно", isCorrect: true, order: 2 },
                ],
              },
            },
            {
              type: "SINGLE_CHOICE",
              text: "Что означает буква T в классификации TNM?",
              points: 1,
              order: 4,
              answers: {
                create: [
                  { text: "Тип опухоли", isCorrect: false, order: 1 },
                  { text: "Размер/распространённость первичной опухоли", isCorrect: true, order: 2 },
                  { text: "Токсичность лечения", isCorrect: false, order: 3 },
                  { text: "Температура тела пациента", isCorrect: false, order: 4 },
                ],
              },
            },
            {
              type: "SINGLE_CHOICE",
              text: "Что означает буква N в классификации TNM?",
              points: 1,
              order: 5,
              answers: {
                create: [
                  { text: "Некроз опухоли", isCorrect: false, order: 1 },
                  { text: "Поражение регионарных лимфоузлов", isCorrect: true, order: 2 },
                  { text: "Наследственность", isCorrect: false, order: 3 },
                  { text: "Нейротоксичность", isCorrect: false, order: 4 },
                ],
              },
            },
            {
              type: "SINGLE_CHOICE",
              text: "Что означает буква M в классификации TNM?",
              points: 1,
              order: 6,
              answers: {
                create: [
                  { text: "Метастазы", isCorrect: true, order: 1 },
                  { text: "Митотический индекс", isCorrect: false, order: 2 },
                  { text: "Морфология клеток", isCorrect: false, order: 3 },
                  { text: "Молекулярный маркер", isCorrect: false, order: 4 },
                ],
              },
            },
            {
              type: "MULTIPLE_CHOICE",
              text: "Какие из перечисленных методов применяются в диагностике онкологических заболеваний?",
              points: 2,
              order: 7,
              scoringMode: "PARTIAL",
              answers: {
                create: [
                  { text: "Биопсия", isCorrect: true, order: 1 },
                  { text: "Компьютерная томография", isCorrect: true, order: 2 },
                  { text: "Электрокардиография", isCorrect: false, order: 3 },
                  { text: "Гистологическое исследование", isCorrect: true, order: 4 },
                ],
              },
            },
            {
              type: "MULTIPLE_CHOICE",
              text: "Какие из перечисленных методов относятся к лечению онкологических заболеваний?",
              points: 2,
              order: 8,
              scoringMode: "PARTIAL",
              answers: {
                create: [
                  { text: "Хирургическое лечение", isCorrect: true, order: 1 },
                  { text: "Лучевая терапия", isCorrect: true, order: 2 },
                  { text: "Химиотерапия", isCorrect: true, order: 3 },
                  { text: "Физиотерапия", isCorrect: false, order: 4 },
                ],
              },
            },
            {
              type: "TRUE_FALSE",
              text: "Раннее выявление злокачественной опухоли, как правило, улучшает прогноз лечения.",
              points: 1,
              order: 9,
              answers: {
                create: [
                  { text: "Верно", isCorrect: true, order: 1 },
                  { text: "Неверно", isCorrect: false, order: 2 },
                ],
              },
            },
            {
              type: "SINGLE_CHOICE",
              text: "Как называется метод исследования, при котором ткань опухоли изучается под микроскопом?",
              points: 1,
              order: 10,
              answers: {
                create: [
                  { text: "Гистологическое исследование", isCorrect: true, order: 1 },
                  { text: "Аускультация", isCorrect: false, order: 2 },
                  { text: "Пальпация", isCorrect: false, order: 3 },
                  { text: "Перкуссия", isCorrect: false, order: 4 },
                ],
              },
            },
            {
              type: "TEXT_ANSWER",
              text: "Как называется процесс распространения опухолевых клеток из первичного очага в другие органы?",
              explanation: "Метастазирование — распространение опухолевых клеток по организму.",
              points: 1,
              order: 11,
              correctTextAnswers: ["метастазирование", "метастазирование опухоли"],
            },
            {
              type: "SINGLE_CHOICE",
              text: "Какой врач специализируется на лечении онкологических заболеваний хирургическими методами?",
              points: 1,
              order: 12,
              answers: {
                create: [
                  { text: "Онколог-хирург", isCorrect: true, order: 1 },
                  { text: "Терапевт", isCorrect: false, order: 2 },
                  { text: "Офтальмолог", isCorrect: false, order: 3 },
                  { text: "Дерматолог", isCorrect: false, order: 4 },
                ],
              },
            },
            {
              type: "TRUE_FALSE",
              text: "Скрининговые программы направлены на выявление заболевания на ранней, бессимптомной стадии.",
              points: 1,
              order: 13,
              answers: {
                create: [
                  { text: "Верно", isCorrect: true, order: 1 },
                  { text: "Неверно", isCorrect: false, order: 2 },
                ],
              },
            },
          ],
        },
      },
    }));

  const existingAssignment = await prisma.testAssignment.findFirst({ where: { testVersionId: version.id } });

  if (!existingAssignment) {
    await prisma.testAssignment.create({
      data: {
        testVersionId: version.id,
        createdById: teacher.id,
        title: "Основы онкологии — вводное тестирование",
        availableFrom: new Date(),
        availableUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        timeLimitMinutes: 30,
        attemptsAllowed: 1,
        randomizeQuestions: true,
        randomizeAnswers: true,
        showResult: true,
        showCorrectAnswers: false,
        allowResume: true,
        status: "ACTIVE",
        groups: {
          create: [{ groupId: group401.id }],
        },
      },
    });
  }

  console.log("Seed complete.");
  console.log("  admin / admin123");
  console.log("  demo_methodist / methodist123");
  console.log("  demo_teacher / teacher123");
  console.log("  students: ivanov1..fedorova6 / student123");
  void admin;
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
