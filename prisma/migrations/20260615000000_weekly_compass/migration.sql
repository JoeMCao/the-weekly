-- Weekly Compass pivot: replace daily habit tables with weekly reviews.

DROP TABLE IF EXISTS "HabitCheck";
DROP TABLE IF EXISTS "DayEntry";
DROP TABLE IF EXISTS "Habit";
DROP TABLE IF EXISTS "Profile";

CREATE TABLE "WeeklyReview" (
    "id" TEXT NOT NULL,
    "weekStart" DATE NOT NULL,
    "alignmentScore" INTEGER,
    "alignmentReason" TEXT,
    "principles" JSONB NOT NULL DEFAULT '[]',
    "faults" JSONB NOT NULL DEFAULT '{"selected":[],"whereShowedUp":""}',
    "provedMeWrong" TEXT,
    "avoiding" TEXT,
    "commitments" JSONB NOT NULL DEFAULT '["","",""]',
    "nextWeekJose" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WeeklyReview_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WeeklyReview_weekStart_key" ON "WeeklyReview"("weekStart");
