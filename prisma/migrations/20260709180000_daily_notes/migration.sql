-- CreateTable
CREATE TABLE "DailyNote" (
    "id" TEXT NOT NULL,
    "weekStart" DATE NOT NULL,
    "noteDate" DATE NOT NULL,
    "content" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyNote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DailyNote_weekStart_idx" ON "DailyNote"("weekStart");

-- CreateIndex
CREATE INDEX "DailyNote_noteDate_idx" ON "DailyNote"("noteDate");

-- CreateIndex
CREATE UNIQUE INDEX "DailyNote_weekStart_noteDate_key" ON "DailyNote"("weekStart", "noteDate");
