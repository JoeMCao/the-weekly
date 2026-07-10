import type { DateKey } from "@/lib/date";
import { isValidDateKey } from "@/lib/date";
import { weekEndKey } from "@/lib/week";

export const NEXT_WEEK_COMMITMENT_COUNT = 5;

export type NextWeekCommitment = {
  id: string;
  text: string;
};

export type NextWeekCommitments = [
  NextWeekCommitment,
  NextWeekCommitment,
  NextWeekCommitment,
  NextWeekCommitment,
  NextWeekCommitment,
];

export type PreviousCommitmentStatus = "completed" | "partial" | "missed";

export type PreviousCommitment = {
  id: string;
  text: string;
  sourceReviewId: string;
  sourceWeekStart: DateKey;
  sourceWeekEnd: DateKey;
  status: PreviousCommitmentStatus | null;
};

function newCommitmentId(): string {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function createEmptyNextWeekCommitment(): NextWeekCommitment {
  return { id: newCommitmentId(), text: "" };
}

export function emptyNextWeekCommitments(): NextWeekCommitments {
  return Array.from({ length: NEXT_WEEK_COMMITMENT_COUNT }, () =>
    createEmptyNextWeekCommitment(),
  ) as NextWeekCommitments;
}

export function commitmentHasText(c: NextWeekCommitment): boolean {
  return c.text.trim().length > 0;
}

export function parseNextWeekCommitments(
  raw: unknown,
  existing?: NextWeekCommitments,
): NextWeekCommitments {
  const base = existing
    ? ([...existing] as NextWeekCommitments)
    : emptyNextWeekCommitments();

  if (!Array.isArray(raw)) return base;

  for (let i = 0; i < NEXT_WEEK_COMMITMENT_COUNT; i++) {
    const item = raw[i];
    if (typeof item === "string") {
      base[i] = {
        id: base[i]?.id || newCommitmentId(),
        text: item,
      };
      continue;
    }
    if (item && typeof item === "object") {
      const obj = item as Record<string, unknown>;
      base[i] = {
        id:
          typeof obj.id === "string" && obj.id
            ? obj.id
            : base[i]?.id || newCommitmentId(),
        text: String(obj.text ?? ""),
      };
    }
  }

  return base;
}

export function isPreviousCommitmentStatus(
  v: unknown,
): v is PreviousCommitmentStatus {
  return v === "completed" || v === "partial" || v === "missed";
}

export function parsePreviousCommitmentStatus(
  raw: unknown,
): PreviousCommitmentStatus | null {
  if (isPreviousCommitmentStatus(raw)) return raw;
  if (raw === "not_completed") return "missed";
  if (raw === true) return "completed";
  if (raw === false) return "missed";
  return null;
}

function parsePreviousCommitmentItem(
  item: Record<string, unknown>,
  fallbackSource?: {
    sourceReviewId: string;
    sourceWeekStart: DateKey;
    sourceWeekEnd: DateKey;
  },
): PreviousCommitment | null {
  const text = String(item.text ?? "").trim();
  if (!text) return null;

  const sourceWeekStart = String(
    item.sourceWeekStart ?? fallbackSource?.sourceWeekStart ?? "",
  );
  if (!isValidDateKey(sourceWeekStart)) return null;

  const sourceWeekEndRaw = String(
    item.sourceWeekEnd ?? fallbackSource?.sourceWeekEnd ?? "",
  );
  const sourceWeekEnd = isValidDateKey(sourceWeekEndRaw)
    ? sourceWeekEndRaw
    : weekEndKey(sourceWeekStart);

  return {
    id: typeof item.id === "string" && item.id ? item.id : newCommitmentId(),
    text,
    sourceReviewId: String(
      item.sourceReviewId ?? fallbackSource?.sourceReviewId ?? "",
    ),
    sourceWeekStart,
    sourceWeekEnd,
    status: parsePreviousCommitmentStatus(item.status ?? item.completed),
  };
}

/** Parses snapshot array stored on the current review (legacy shapes supported). */
export function parsePreviousCommitments(raw: unknown): PreviousCommitment[] {
  if (!raw) return [];

  if (Array.isArray(raw)) {
    return raw
      .filter(
        (item): item is Record<string, unknown> =>
          typeof item === "object" && item !== null,
      )
      .map((item) => parsePreviousCommitmentItem(item))
      .filter((item): item is PreviousCommitment => item !== null);
  }

  if (typeof raw === "object") {
    const obj = raw as Record<string, unknown>;

    if (Array.isArray(obj.items)) {
      const sourceWeekStart = String(obj.sourceWeekStart ?? "");
      const fallback =
        isValidDateKey(sourceWeekStart)
          ? {
              sourceReviewId: "",
              sourceWeekStart,
              sourceWeekEnd: weekEndKey(sourceWeekStart),
            }
          : undefined;

      return obj.items
        .filter(
          (item): item is Record<string, unknown> =>
            typeof item === "object" && item !== null,
        )
        .map((item) => parsePreviousCommitmentItem(item, fallback))
        .filter((item): item is PreviousCommitment => item !== null);
    }
  }

  return [];
}

export function buildPreviousCommitmentsSnapshot(input: {
  id: string;
  weekStart: DateKey;
  nextWeekCommitments: NextWeekCommitments;
}): PreviousCommitment[] {
  const sourceWeekStart = input.weekStart;
  const sourceWeekEnd = weekEndKey(sourceWeekStart);

  return input.nextWeekCommitments
    .filter(commitmentHasText)
    .map((c) => ({
      id: newCommitmentId(),
      text: c.text.trim(),
      sourceReviewId: input.id,
      sourceWeekStart,
      sourceWeekEnd,
      status: null as PreviousCommitmentStatus | null,
    }));
}

export function previousCommitmentsHaveStatuses(
  items: PreviousCommitment[],
): boolean {
  return items.some((item) => item.status !== null);
}

export function computeCommitmentScore(items: PreviousCommitment[]): {
  score: number;
  total: number;
} {
  if (items.length === 0) return { score: 0, total: 0 };

  let score = 0;
  for (const item of items) {
    if (item.status === "completed") score += 1;
    else if (item.status === "partial") score += 0.5;
  }

  return { score, total: items.length };
}

export function countCompletedCommitments(items: PreviousCommitment[]): {
  checked: number;
  total: number;
} {
  return {
    checked: items.filter((item) => item.status === "completed").length,
    total: items.length,
  };
}

export function formatCommitmentScore(score: number, total: number): string {
  if (total === 0) return "0 / 0";
  const scoreLabel = Number.isInteger(score) ? String(score) : score.toFixed(1);
  return `${scoreLabel} / ${total}`;
}

export function formatPreviousCommitmentSourceRange(
  items: PreviousCommitment[],
): string | null {
  const first = items[0];
  if (!first) return null;

  const start = fromDateKeyLabel(first.sourceWeekStart);
  const end = fromDateKeyLabel(first.sourceWeekEnd);
  return `${start} – ${end}`;
}

function fromDateKeyLabel(key: DateKey): string {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export const PREVIOUS_COMMITMENT_STATUSES: {
  value: PreviousCommitmentStatus;
  label: string;
}[] = [
  { value: "completed", label: "Completed" },
  { value: "partial", label: "Partial" },
  { value: "missed", label: "Missed" },
];

export function previousCommitmentStatusLabel(
  status: PreviousCommitmentStatus | null,
): string {
  if (status === "completed") return "Completed";
  if (status === "partial") return "Partial";
  if (status === "missed") return "Missed";
  return "Not rated";
}
