import { prisma } from "@/lib/prisma";
import {
  emptyCommitments,
  emptyFaults,
  emptyPrinciples,
  type FaultKey,
  type FaultsData,
  type PrincipleKey,
  type PrincipleReview,
  type PrincipleStatus,
} from "@/lib/principles";
import type { DateKey } from "@/lib/date";
import {
  addWeeks,
  utcToWeekStart,
  weekStartToUtc,
} from "@/lib/week";

export type WeeklyReviewData = {
  weekStart: DateKey;
  alignmentScore: number | null;
  alignmentReason: string;
  principles: PrincipleReview[];
  faults: FaultsData;
  provedMeWrong: string;
  avoiding: string;
  commitments: [string, string, string];
  nextWeekJose: string;
};

export type WeeklyReviewSummary = WeeklyReviewData & {
  id: string;
  isComplete: boolean;
};

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
      status: isValidStatus(found.status) ? found.status : null,
    };
  });
}

function isValidStatus(v: unknown): v is PrincipleStatus {
  return v === "yes" || v === "somewhat" || v === "no";
}

function parseFaults(raw: unknown): FaultsData {
  const base = emptyFaults();
  if (!raw || typeof raw !== "object") return base;
  const obj = raw as Record<string, unknown>;
  const selected = Array.isArray(obj.selected)
    ? obj.selected.filter((k): k is FaultKey => typeof k === "string")
    : [];
  return {
    selected,
    whereShowedUp: String(obj.whereShowedUp ?? ""),
  };
}

function parseCommitments(raw: unknown): [string, string, string] {
  if (!Array.isArray(raw)) return emptyCommitments();
  return [
    String(raw[0] ?? ""),
    String(raw[1] ?? ""),
    String(raw[2] ?? ""),
  ];
}

function rowToData(row: {
  weekStart: Date;
  alignmentScore: number | null;
  alignmentReason: string | null;
  principles: unknown;
  faults: unknown;
  provedMeWrong: string | null;
  avoiding: string | null;
  commitments: unknown;
  nextWeekJose: string | null;
}): WeeklyReviewData {
  return {
    weekStart: utcToWeekStart(row.weekStart),
    alignmentScore: row.alignmentScore,
    alignmentReason: row.alignmentReason ?? "",
    principles: parsePrinciples(row.principles),
    faults: parseFaults(row.faults),
    provedMeWrong: row.provedMeWrong ?? "",
    avoiding: row.avoiding ?? "",
    commitments: parseCommitments(row.commitments),
    nextWeekJose: row.nextWeekJose ?? "",
  };
}

/** True when the user has entered anything meaningful (not just an empty shell). */
export function reviewHasSubstance(data: WeeklyReviewData): boolean {
  if (data.alignmentScore !== null) return true;
  if (data.alignmentReason.trim().length > 0) return true;
  if (data.principles.some((p) => p.reflection.trim() || p.status)) return true;
  if (data.faults.selected.length > 0 || data.faults.whereShowedUp.trim()) {
    return true;
  }
  if (data.provedMeWrong.trim() || data.avoiding.trim()) return true;
  if (data.commitments.some((c) => c.trim().length > 0)) return true;
  if (data.nextWeekJose.trim().length > 0) return true;
  return false;
}

/** A review is complete when the north star and identity statement are answered. */
export function isReviewComplete(data: WeeklyReviewData): boolean {
  return (
    data.alignmentScore !== null &&
    data.alignmentReason.trim().length > 0 &&
    data.nextWeekJose.trim().length > 0
  );
}

export async function getReviewForWeek(
  weekStart: DateKey,
): Promise<WeeklyReviewSummary | null> {
  const row = await prisma.weeklyReview.findUnique({
    where: { weekStart: weekStartToUtc(weekStart) },
  });
  if (!row) return null;
  const data = rowToData(row);
  return { ...data, id: row.id, isComplete: isReviewComplete(data) };
}

export async function ensureReview(weekStart: DateKey): Promise<WeeklyReviewSummary> {
  const existing = await getReviewForWeek(weekStart);
  if (existing) return existing;

  const row = await prisma.weeklyReview.create({
    data: {
      weekStart: weekStartToUtc(weekStart),
      principles: emptyPrinciples(),
      faults: emptyFaults(),
      commitments: emptyCommitments(),
    },
  });
  const data = rowToData(row);
  return { ...data, id: row.id, isComplete: false };
}

export type SaveReviewInput = Partial<
  Omit<WeeklyReviewData, "weekStart" | "principles" | "faults" | "commitments">
> & {
  principles?: Partial<Record<PrincipleKey, Partial<PrincipleReview>>>;
  faults?: Partial<FaultsData>;
  commitments?: [string, string, string];
};

export async function saveReview(
  weekStart: DateKey,
  input: SaveReviewInput,
): Promise<WeeklyReviewSummary> {
  const current = await ensureReview(weekStart);

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

  let faults = current.faults;
  if (input.faults) {
    faults = { ...faults, ...input.faults };
  }

  let commitments = current.commitments;
  if (input.commitments) {
    commitments = input.commitments;
  }

  const alignmentScore =
    input.alignmentScore !== undefined
      ? input.alignmentScore
      : current.alignmentScore;

  const row = await prisma.weeklyReview.update({
    where: { weekStart: weekStartToUtc(weekStart) },
    data: {
      alignmentScore:
        alignmentScore !== null
          ? Math.min(5, Math.max(1, Math.round(alignmentScore)))
          : null,
      alignmentReason:
        input.alignmentReason !== undefined
          ? input.alignmentReason
          : current.alignmentReason,
      principles,
      faults,
      provedMeWrong:
        input.provedMeWrong !== undefined
          ? input.provedMeWrong
          : current.provedMeWrong,
      avoiding:
        input.avoiding !== undefined ? input.avoiding : current.avoiding,
      commitments,
      nextWeekJose:
        input.nextWeekJose !== undefined
          ? input.nextWeekJose
          : current.nextWeekJose,
    },
  });

  const data = rowToData(row);
  return { ...data, id: row.id, isComplete: isReviewComplete(data) };
}

export async function getCompletedReviews(): Promise<WeeklyReviewSummary[]> {
  const rows = await prisma.weeklyReview.findMany({
    orderBy: { weekStart: "asc" },
  });
  return rows.map((row) => {
    const data = rowToData(row);
    return { ...data, id: row.id, isComplete: isReviewComplete(data) };
  });
}

export async function getPreviousWeekReview(
  currentWeekStart: DateKey,
): Promise<WeeklyReviewSummary | null> {
  return getReviewForWeek(addWeeks(currentWeekStart, -1));
}
