import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  buildPreviousCommitmentsSnapshot,
  commitmentHasText,
  parseNextWeekCommitments,
  parsePreviousCommitments,
  previousCommitmentsHaveStatuses,
  type NextWeekCommitments,
  type PreviousCommitment,
} from "@/lib/commitments";
import {
  emptyPrinciples,
  emptyReviewMetadata,
  emptyWeeklyReflection,
  type PrincipleKey,
  type PrincipleReview,
  type PrincipleStatus,
  type ReviewMetadata,
  type WeeklyReflection,
} from "@/lib/principles";
import type { DateKey } from "@/lib/date";
import { isValidDateKey } from "@/lib/date";
import { addWeeks, utcToWeekStart, weekStartToUtc } from "@/lib/week";
import {
  FIRST_WEEK_START,
  weekStartsFromAnchorThrough,
} from "@/lib/week-calendar";

export type WeeklyReviewData = {
  weekStart: DateKey;
  principles: PrincipleReview[];
  weeklyReflection: WeeklyReflection;
  reviewMetadata: ReviewMetadata;
  previousCommitments: PreviousCommitment[];
};

export type WeeklyReviewSummary = WeeklyReviewData & {
  id: string;
  isComplete: boolean;
  previousCommitmentsStale: boolean;
};

function isValidStatus(v: unknown): v is PrincipleStatus {
  return v === "yes" || v === "somewhat" || v === "no";
}

function parsePrinciples(raw: unknown): PrincipleReview[] {
  const base = emptyPrinciples();
  if (!Array.isArray(raw)) return base;
  const byKey = new Map(
    raw
      .filter((p): p is PrincipleReview => typeof p === "object" && p !== null)
      .map((p) => [p.key, p]),
  );
  return base.map((p) => {
    const found = byKey.get(p.key);
    if (!found) return p;
    return {
      key: p.key,
      reflection: String(found.reflection ?? ""),
      evidence: String(found.evidence ?? ""),
      status: isValidStatus(found.status) ? found.status : null,
    };
  });
}

function parseWeeklyReflection(raw: unknown): WeeklyReflection {
  const base = emptyWeeklyReflection();
  if (!raw || typeof raw !== "object") return base;
  const obj = raw as Record<string, unknown>;
  return {
    weekSummary: String(obj.weekSummary ?? obj.evidenceReview ?? ""),
    wins: String(obj.wins ?? ""),
    attentionRequired: String(obj.attentionRequired ?? ""),
    recurringPattern: String(obj.recurringPattern ?? ""),
    theme: String(obj.theme ?? ""),
    nextWeekCommitments: parseNextWeekCommitments(
      obj.nextWeekCommitments ??
        (typeof obj.oneCommitment === "string" && obj.oneCommitment
          ? [obj.oneCommitment]
          : null) ??
        (typeof obj.weekWin === "string" && obj.weekWin ? [obj.weekWin] : null),
    ),
  };
}

function parseReviewMetadata(
  raw: unknown,
  defaultReviewDate: string,
): ReviewMetadata {
  const base = emptyReviewMetadata(defaultReviewDate);
  if (!raw || typeof raw !== "object") return base;
  const obj = raw as Record<string, unknown>;
  const reviewDate =
    typeof obj.reviewDate === "string" && isValidDateKey(obj.reviewDate)
      ? obj.reviewDate
      : defaultReviewDate || base.reviewDate;
  return {
    reviewDate,
    context: String(obj.context ?? ""),
    savedAt: typeof obj.savedAt === "string" ? obj.savedAt : null,
  };
}

function rowToData(
  row: {
    weekStart: Date;
    principles: unknown;
    weeklyReflection: unknown;
    reviewMetadata: unknown;
    priorWeekCommitments: unknown;
  },
  defaultReviewDate = "",
): WeeklyReviewData {
  return {
    weekStart: utcToWeekStart(row.weekStart),
    principles: parsePrinciples(row.principles),
    weeklyReflection: parseWeeklyReflection(row.weeklyReflection),
    reviewMetadata: parseReviewMetadata(row.reviewMetadata, defaultReviewDate),
    previousCommitments: parsePreviousCommitments(row.priorWeekCommitments),
  };
}

function rowToSummary(
  row: {
    id: string;
    weekStart: Date;
    principles: unknown;
    weeklyReflection: unknown;
    reviewMetadata: unknown;
    priorWeekCommitments: unknown;
  },
  defaultReviewDate = "",
  previousCommitmentsStale = false,
): WeeklyReviewSummary {
  const data = rowToData(row, defaultReviewDate);
  return {
    ...data,
    id: row.id,
    isComplete: isReviewComplete(data),
    previousCommitmentsStale,
  };
}

async function isPreviousCommitmentsSnapshotStale(
  data: WeeklyReviewData,
  defaultReviewDate: string,
): Promise<boolean> {
  if (data.previousCommitments.length === 0) return false;

  const latestCompleted = await getLatestCompletedReviewBefore(
    data.weekStart,
    defaultReviewDate,
  );
  if (!latestCompleted) return false;

  const currentSourceId = data.previousCommitments[0]?.sourceReviewId;
  return Boolean(currentSourceId && currentSourceId !== latestCompleted.id);
}

function principleHasSubstance(p: PrincipleReview): boolean {
  return Boolean(p.reflection.trim() || p.evidence.trim() || p.status);
}

export function reviewHasSubstance(data: WeeklyReviewData): boolean {
  if (data.principles.some(principleHasSubstance)) return true;
  if (data.previousCommitments.some((i) => i.status)) return true;
  const r = data.weeklyReflection;
  const m = data.reviewMetadata;
  return Boolean(
    m.context.trim() ||
      r.weekSummary.trim() ||
      r.wins.trim() ||
      r.attentionRequired.trim() ||
      r.recurringPattern.trim() ||
      r.theme.trim() ||
      r.nextWeekCommitments.some(commitmentHasText),
  );
}

export function isReviewComplete(data: WeeklyReviewData): boolean {
  const { weekSummary, theme, nextWeekCommitments } = data.weeklyReflection;
  if (!weekSummary.trim() || !theme.trim()) return false;
  if (!nextWeekCommitments.some(commitmentHasText)) return false;

  const rated = data.principles.filter((p) => p.status !== null);
  if (rated.length === 0) return false;
  if (!rated.every((p) => p.reflection.trim().length > 0)) return false;

  if (data.previousCommitments.length > 0) {
    return data.previousCommitments.every((item) => item.status !== null);
  }

  return true;
}

async function loadReviewRow(weekStart: DateKey) {
  return prisma.weeklyReview.findUnique({
    where: { weekStart: weekStartToUtc(weekStart) },
  });
}

export async function getLatestCompletedReviewBefore(
  weekStart: DateKey,
  defaultReviewDate = "",
): Promise<WeeklyReviewSummary | null> {
  const rows = await prisma.weeklyReview.findMany({
    where: { weekStart: { lt: weekStartToUtc(weekStart) } },
    orderBy: { weekStart: "desc" },
  });

  for (const row of rows) {
    const summary = rowToSummary(row, defaultReviewDate);
    if (summary.isComplete) return summary;
  }

  return null;
}

async function snapshotPreviousCommitmentsForNewReview(
  weekStart: DateKey,
  defaultReviewDate = "",
): Promise<PreviousCommitment[] | null> {
  const previousReview = await getLatestCompletedReviewBefore(
    weekStart,
    defaultReviewDate,
  );
  if (!previousReview) return null;

  const snapshot = buildPreviousCommitmentsSnapshot({
    id: previousReview.id,
    weekStart: previousReview.weekStart,
    nextWeekCommitments: previousReview.weeklyReflection.nextWeekCommitments,
  });

  return snapshot.length > 0 ? snapshot : null;
}

export async function getReviewForWeek(
  weekStart: DateKey,
  defaultReviewDate = "",
): Promise<WeeklyReviewSummary | null> {
  const row = await loadReviewRow(weekStart);
  if (!row) return null;

  let data = rowToData(row, defaultReviewDate);

  if (!data.reviewMetadata.reviewDate && defaultReviewDate) {
    data = {
      ...data,
      reviewMetadata: {
        ...data.reviewMetadata,
        reviewDate: defaultReviewDate,
      },
    };
  }

  data = await maybeRefreshStalePreviousCommitments(data, defaultReviewDate);
  const previousCommitmentsStale = await isPreviousCommitmentsSnapshotStale(
    data,
    defaultReviewDate,
  );

  return {
    ...data,
    id: row.id,
    isComplete: isReviewComplete(data),
    previousCommitmentsStale,
  };
}

/** When a week was created before the prior review was completed, its snapshot can be stale. */
async function maybeRefreshStalePreviousCommitments(
  data: WeeklyReviewData,
  defaultReviewDate: string,
): Promise<WeeklyReviewData> {
  if (data.previousCommitments.length === 0) return data;
  if (previousCommitmentsHaveStatuses(data.previousCommitments)) return data;

  const latestCompleted = await getLatestCompletedReviewBefore(
    data.weekStart,
    defaultReviewDate,
  );
  if (!latestCompleted) return data;

  const currentSourceId = data.previousCommitments[0]?.sourceReviewId;
  if (!currentSourceId || currentSourceId === latestCompleted.id) return data;

  const snapshot = buildPreviousCommitmentsSnapshot({
    id: latestCompleted.id,
    weekStart: latestCompleted.weekStart,
    nextWeekCommitments: latestCompleted.weeklyReflection.nextWeekCommitments,
  });

  await prisma.weeklyReview.update({
    where: { weekStart: weekStartToUtc(data.weekStart) },
    data: {
      priorWeekCommitments: snapshot.length > 0 ? snapshot : Prisma.DbNull,
    },
  });

  return { ...data, previousCommitments: snapshot };
}

export async function ensureReview(
  weekStart: DateKey,
  defaultReviewDate = "",
): Promise<WeeklyReviewSummary> {
  const existing = await getReviewForWeek(weekStart, defaultReviewDate);
  if (existing) return existing;

  if (weekStart < FIRST_WEEK_START) {
    throw new Error(`No review before the first week (${FIRST_WEEK_START}).`);
  }

  const previousCommitments = await snapshotPreviousCommitmentsForNewReview(
    weekStart,
    defaultReviewDate,
  );

  const row = await prisma.weeklyReview.create({
    data: {
      weekStart: weekStartToUtc(weekStart),
      principles: emptyPrinciples(),
      weeklyReflection: emptyWeeklyReflection(),
      reviewMetadata: emptyReviewMetadata(defaultReviewDate),
      priorWeekCommitments:
        previousCommitments && previousCommitments.length > 0
          ? previousCommitments
          : Prisma.DbNull,
    },
  });

  const data = rowToData(row, defaultReviewDate);
  return {
    ...data,
    id: row.id,
    isComplete: false,
    previousCommitmentsStale: false,
  };
}

export async function ensureWeekCalendar(
  currentWeekStart: DateKey,
  defaultReviewDate = "",
): Promise<void> {
  const keys = weekStartsFromAnchorThrough(currentWeekStart);
  if (keys.length === 0) return;

  for (const weekStart of keys) {
    const exists = await loadReviewRow(weekStart);
    if (exists) continue;

    const previousCommitments = await snapshotPreviousCommitmentsForNewReview(
      weekStart,
      defaultReviewDate,
    );

    await prisma.weeklyReview.create({
      data: {
        weekStart: weekStartToUtc(weekStart),
        principles: emptyPrinciples(),
        weeklyReflection: emptyWeeklyReflection(),
        reviewMetadata: emptyReviewMetadata(defaultReviewDate),
        priorWeekCommitments:
          previousCommitments && previousCommitments.length > 0
            ? previousCommitments
            : Prisma.DbNull,
      },
    });
  }
}

export type SaveReviewInput = {
  principles?: Partial<Record<PrincipleKey, Partial<PrincipleReview>>>;
  weeklyReflection?: Partial<WeeklyReflection>;
  reviewMetadata?: Partial<ReviewMetadata>;
  previousCommitments?: PreviousCommitment[];
  markSaved?: boolean;
};

export type SaveReviewResult = WeeklyReviewSummary & {
  savedAt: string | null;
};

export async function saveReview(
  weekStart: DateKey,
  input: SaveReviewInput,
  defaultReviewDate = "",
): Promise<SaveReviewResult> {
  const current = await ensureReview(weekStart, defaultReviewDate);

  let principles = current.principles;
  if (input.principles) {
    principles = principles.map((p) => {
      const patch = input.principles?.[p.key];
      if (!patch) return p;
      return {
        ...p,
        ...patch,
        status:
          patch.status === undefined
            ? p.status
            : isValidStatus(patch.status)
              ? patch.status
              : null,
      };
    });
  }

  const weeklyReflection = {
    ...current.weeklyReflection,
    ...input.weeklyReflection,
  };

  if (input.weeklyReflection?.nextWeekCommitments) {
    weeklyReflection.nextWeekCommitments = parseNextWeekCommitments(
      input.weeklyReflection.nextWeekCommitments,
      current.weeklyReflection.nextWeekCommitments,
    );
  }

  let reviewMetadata: ReviewMetadata = {
    ...current.reviewMetadata,
    ...input.reviewMetadata,
  };

  if (input.markSaved) {
    reviewMetadata = {
      ...reviewMetadata,
      savedAt: new Date().toISOString(),
    };
  }

  const previousCommitments =
    input.previousCommitments !== undefined
      ? input.previousCommitments
      : current.previousCommitments;

  const row = await prisma.weeklyReview.update({
    where: { weekStart: weekStartToUtc(weekStart) },
    data: {
      principles,
      weeklyReflection,
      reviewMetadata,
      priorWeekCommitments:
        previousCommitments.length > 0 ? previousCommitments : Prisma.DbNull,
    },
  });

  const data = rowToData(row, defaultReviewDate);
  const previousCommitmentsStale = await isPreviousCommitmentsSnapshotStale(
    data,
    defaultReviewDate,
  );
  const summary: SaveReviewResult = {
    ...data,
    id: row.id,
    isComplete: isReviewComplete(data),
    previousCommitmentsStale,
    savedAt: reviewMetadata.savedAt,
  };
  return summary;
}

export async function refreshPreviousCommitments(
  weekStart: DateKey,
  defaultReviewDate = "",
): Promise<PreviousCommitment[]> {
  await ensureReview(weekStart, defaultReviewDate);

  const previousReview = await getLatestCompletedReviewBefore(
    weekStart,
    defaultReviewDate,
  );

  const snapshot = previousReview
    ? buildPreviousCommitmentsSnapshot({
        id: previousReview.id,
        weekStart: previousReview.weekStart,
        nextWeekCommitments: previousReview.weeklyReflection.nextWeekCommitments,
      })
    : [];

  await prisma.weeklyReview.update({
    where: { weekStart: weekStartToUtc(weekStart) },
    data: {
      priorWeekCommitments: snapshot.length > 0 ? snapshot : Prisma.DbNull,
    },
  });

  return snapshot;
}

export async function getAllReviews(): Promise<WeeklyReviewSummary[]> {
  const rows = await prisma.weeklyReview.findMany({
    orderBy: { weekStart: "asc" },
  });
  return rows.map((row) => rowToSummary(row));
}

export const getCompletedReviews = getAllReviews;

export async function getPreviousWeekReview(
  currentWeekStart: DateKey,
  defaultReviewDate = "",
): Promise<WeeklyReviewSummary | null> {
  return getReviewForWeek(addWeeks(currentWeekStart, -1), defaultReviewDate);
}
