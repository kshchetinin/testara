-- CreateEnum
CREATE TYPE "SubjectStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

-- CreateTable
CREATE TABLE "Subject" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "SubjectStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Subject_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Subject_name_key" ON "Subject"("name");

-- CreateIndex
CREATE INDEX "Subject_status_idx" ON "Subject"("status");

-- Data backfill: turn every distinct free-text Test.subject value that exists today
-- into a real Subject row, so no existing test loses its discipline.
INSERT INTO "Subject" ("id", "name", "status", "createdAt")
SELECT gen_random_uuid(), t."subject", 'ACTIVE', CURRENT_TIMESTAMP
FROM (SELECT DISTINCT "subject" FROM "Test") t;

-- AlterTable: add the new FK column nullable first so we can backfill it from the
-- old free-text column before enforcing NOT NULL.
ALTER TABLE "Test" ADD COLUMN "subjectId" TEXT;

UPDATE "Test" t
SET "subjectId" = s."id"
FROM "Subject" s
WHERE s."name" = t."subject";

ALTER TABLE "Test" ALTER COLUMN "subjectId" SET NOT NULL;
ALTER TABLE "Test" DROP COLUMN "subject";

-- CreateIndex
CREATE INDEX "Test_subjectId_idx" ON "Test"("subjectId");

-- AddForeignKey
ALTER TABLE "Test" ADD CONSTRAINT "Test_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "_UserSubjects" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_UserSubjects_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_UserSubjects_B_index" ON "_UserSubjects"("B");

-- AddForeignKey
ALTER TABLE "_UserSubjects" ADD CONSTRAINT "_UserSubjects_A_fkey" FOREIGN KEY ("A") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_UserSubjects" ADD CONSTRAINT "_UserSubjects_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Data backfill: give every existing TEACHER/METHODIST access to every subject that
-- exists at migration time (today, effectively just "Онкология") so nobody loses
-- access to tests/assignments/results they could already see before this migration.
-- The admin can narrow individual teachers down afterwards via the "Предметы" UI.
INSERT INTO "_UserSubjects" ("A", "B")
SELECT s."id", u."id"
FROM "Subject" s
CROSS JOIN "User" u
WHERE u."role" IN ('TEACHER', 'METHODIST');
