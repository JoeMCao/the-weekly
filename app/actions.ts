"use server";

import { revalidatePath } from "next/cache";
import { isValidDateKey } from "@/lib/date";
import type { FaultKey, PrincipleKey, PrincipleStatus } from "@/lib/principles";
import {
  type SaveReviewInput,
  saveReview,
} from "@/lib/reviews";

const MAX_TEXT = 4000;

function clampText(value: string): string {
  return String(value ?? "").slice(0, MAX_TEXT);
}

export type SaveReviewResult =
  | { ok: true }
  | { ok: false; error: string };

export async function saveWeeklyReview(
  weekStart: string,
  input: {
    alignmentScore?: number | null;
    alignmentReason?: string;
    principles?: Partial<
      Record<
        PrincipleKey,
        { reflection?: string; status?: PrincipleStatus | null }
      >
    >;
    faults?: { selected?: FaultKey[]; whereShowedUp?: string };
    provedMeWrong?: string;
    avoiding?: string;
    commitments?: [string, string, string];
    nextWeekJose?: string;
  },
): Promise<SaveReviewResult> {
  if (!isValidDateKey(weekStart)) {
    return { ok: false, error: "Invalid week." };
  }

  const payload: SaveReviewInput = {};

  if (input.alignmentScore !== undefined) {
    payload.alignmentScore = input.alignmentScore;
  }
  if (input.alignmentReason !== undefined) {
    payload.alignmentReason = clampText(input.alignmentReason);
  }
  if (input.principles) {
    const principles: SaveReviewInput["principles"] = {};
    for (const [key, value] of Object.entries(input.principles)) {
      if (!value) continue;
      principles[key as PrincipleKey] = {
        reflection:
          value.reflection !== undefined
            ? clampText(value.reflection)
            : undefined,
        status: value.status,
      };
    }
    payload.principles = principles;
  }
  if (input.faults) {
    payload.faults = {
      selected: input.faults.selected,
      whereShowedUp:
        input.faults.whereShowedUp !== undefined
          ? clampText(input.faults.whereShowedUp)
          : undefined,
    };
  }
  if (input.provedMeWrong !== undefined) {
    payload.provedMeWrong = clampText(input.provedMeWrong);
  }
  if (input.avoiding !== undefined) {
    payload.avoiding = clampText(input.avoiding);
  }
  if (input.commitments) {
    payload.commitments = input.commitments.map(clampText) as [
      string,
      string,
      string,
    ];
  }
  if (input.nextWeekJose !== undefined) {
    payload.nextWeekJose = clampText(input.nextWeekJose);
  }

  await saveReview(weekStart, payload);

  revalidatePath("/");
  revalidatePath("/review");
  revalidatePath("/trajectory");
  return { ok: true };
}
