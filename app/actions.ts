"use server";

import { revalidatePath } from "next/cache";
import { isValidDateKey } from "@/lib/date";
import {
  parseNextWeekCommitments,
  type NextWeekCommitment,
  type PreviousCommitment,
  type PreviousCommitmentStatus,
} from "@/lib/commitments";
import type { PrincipleKey, PrincipleStatus } from "@/lib/principles";
import {
  refreshPreviousCommitments,
  type SaveReviewInput,
  saveReview,
} from "@/lib/reviews";
import { upsertDailyNote } from "@/lib/daily-notes";
import { isDateInWeek } from "@/lib/week";

const MAX_TEXT = 4000;
const MAX_DAILY_NOTE = 12000;

function clampText(value: string): string {
  return String(value ?? "").slice(0, MAX_TEXT);
}

export type SaveReviewResult =
  | {
      ok: true;
      savedAt: string | null;
      isComplete: boolean;
      message: string;
    }
  | { ok: false; error: string };

export type RefreshPreviousCommitmentsResult =
  | { ok: true; previousCommitments: PreviousCommitment[] }
  | { ok: false; error: string };

export type SaveDailyNoteResult =
  | { ok: true }
  | { ok: false; error: string };

type ReviewPayload = {
  principles?: Partial<
    Record<
      PrincipleKey,
      {
        reflection?: string;
        evidence?: string;
        status?: PrincipleStatus | null;
      }
    >
  >;
  weeklyReflection?: {
    weekSummary?: string;
    wins?: string;
    attentionRequired?: string;
    recurringPattern?: string;
    theme?: string;
    nextWeekCommitments?: NextWeekCommitment[];
  };
  reviewMetadata?: {
    reviewDate?: string;
    context?: string;
  };
  previousCommitments?: PreviousCommitment[];
};

function buildPayload(input: ReviewPayload): SaveReviewInput {
  const payload: SaveReviewInput = {};

  if (input.principles) {
    const principles: SaveReviewInput["principles"] = {};
    for (const [key, value] of Object.entries(input.principles)) {
      if (!value) continue;
      principles[key as PrincipleKey] = {
        reflection:
          value.reflection !== undefined
            ? clampText(value.reflection)
            : undefined,
        evidence:
          value.evidence !== undefined ? clampText(value.evidence) : undefined,
        status: value.status,
      };
    }
    payload.principles = principles;
  }

  if (input.weeklyReflection) {
    payload.weeklyReflection = {
      weekSummary:
        input.weeklyReflection.weekSummary !== undefined
          ? clampText(input.weeklyReflection.weekSummary)
          : undefined,
      wins:
        input.weeklyReflection.wins !== undefined
          ? clampText(input.weeklyReflection.wins)
          : undefined,
      attentionRequired:
        input.weeklyReflection.attentionRequired !== undefined
          ? clampText(input.weeklyReflection.attentionRequired)
          : undefined,
      recurringPattern:
        input.weeklyReflection.recurringPattern !== undefined
          ? clampText(input.weeklyReflection.recurringPattern)
          : undefined,
      theme:
        input.weeklyReflection.theme !== undefined
          ? clampText(input.weeklyReflection.theme)
          : undefined,
      nextWeekCommitments: input.weeklyReflection.nextWeekCommitments
        ? parseNextWeekCommitments(input.weeklyReflection.nextWeekCommitments)
        : undefined,
    };
  }

  if (input.reviewMetadata) {
    payload.reviewMetadata = {
      reviewDate: input.reviewMetadata.reviewDate,
      context:
        input.reviewMetadata.context !== undefined
          ? clampText(input.reviewMetadata.context)
          : undefined,
    };
  }

  if (input.previousCommitments !== undefined) {
    payload.previousCommitments = input.previousCommitments.map((item) => ({
      ...item,
      text: clampText(item.text),
      status: item.status as PreviousCommitmentStatus | null,
    }));
  }

  return payload;
}

export async function saveWeeklyReview(
  weekStart: string,
  input: ReviewPayload,
): Promise<SaveReviewResult> {
  if (!isValidDateKey(weekStart)) {
    return { ok: false, error: "Invalid week." };
  }

  await saveReview(weekStart, buildPayload(input));

  revalidatePath("/");
  revalidatePath("/review");
  revalidatePath("/trajectory");
  return { ok: true, savedAt: null, isComplete: false, message: "Saved" };
}

export async function submitWeeklyReview(
  weekStart: string,
  input: ReviewPayload,
  defaultReviewDate: string,
): Promise<SaveReviewResult> {
  if (!isValidDateKey(weekStart)) {
    return { ok: false, error: "Invalid week." };
  }

  const result = await saveReview(
    weekStart,
    { ...buildPayload(input), markSaved: true },
    defaultReviewDate,
  );

  revalidatePath("/");
  revalidatePath("/review");
  revalidatePath("/trajectory");

  return {
    ok: true,
    savedAt: result.savedAt,
    isComplete: result.isComplete,
    message: "Review Completed",
  };
}

export async function refreshPreviousCommitmentsFromPriorReview(
  weekStart: string,
  defaultReviewDate: string,
): Promise<RefreshPreviousCommitmentsResult> {
  if (!isValidDateKey(weekStart)) {
    return { ok: false, error: "Invalid week." };
  }

  try {
    const previousCommitments = await refreshPreviousCommitments(
      weekStart,
      defaultReviewDate,
    );

    revalidatePath("/");
    revalidatePath("/review");
    revalidatePath("/trajectory");

    return { ok: true, previousCommitments };
  } catch {
    return { ok: false, error: "Could not refresh previous commitments." };
  }
}

export async function saveDailyNote(
  weekStart: string,
  noteDate: string,
  content: string,
): Promise<SaveDailyNoteResult> {
  if (!isValidDateKey(weekStart) || !isValidDateKey(noteDate)) {
    return { ok: false, error: "Invalid date." };
  }
  if (!isDateInWeek(noteDate, weekStart)) {
    return { ok: false, error: "Note date is not in this week." };
  }

  try {
    await upsertDailyNote({
      weekStart,
      noteDate,
      content: String(content ?? "").slice(0, MAX_DAILY_NOTE),
    });
    revalidatePath("/review");
    return { ok: true };
  } catch {
    return { ok: false, error: "Could not save note." };
  }
}
