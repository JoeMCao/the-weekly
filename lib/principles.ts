import {
  emptyNextWeekCommitments,
  type NextWeekCommitments,
} from "@/lib/commitments";
import {
  emptyLearningLoop,
  type LearningLoop,
  type ModelUpdate,
} from "@/lib/learning-loop";

export type PrincipleKey =
  | "protect-the-engine"
  | "face-reality"
  | "be-clear"
  | "keep-becoming"
  | "leave-them-better"
  | "build-life-together"
  | "my-tribe"
  | "choose-adventure";

export type PrincipleStatus = "yes" | "somewhat" | "no";

export type PrincipleReview = {
  key: PrincipleKey;
  reflection: string;
  /** Legacy — preserved in storage; hidden from the active Part 1 workflow. */
  evidence: string;
  status: PrincipleStatus | null;
  /** Legacy per-principle note — preserved; superseded by assessmentNotes. */
  evaluationNote: string;
};

export type WeeklyReflection = {
  weekSummary: string;
  wins: string;
  attentionRequired: string;
  recurringPattern: string;
  theme: string;
  nextWeekCommitments: NextWeekCommitments;
} & LearningLoop;

export type { ModelUpdate };

export type ReviewMetadata = {
  reviewDate: string;
  context: string;
  savedAt: string | null;
};

export const PRINCIPLES: {
  key: PrincipleKey;
  title: string;
  summary: string;
  failureMode: string;
  question: string;
  followUp: string;
  trajectoryLabel: string;
}[] = [
  {
    key: "protect-the-engine",
    title: "Protect the Engine",
    summary: "Treat your body and mind as the foundation for everything else.",
    failureMode: "Self-neglect, poor recovery, burnout, low energy.",
    question:
      "Did I treat my body and mind like an asset or a liability this week?",
    followUp: "What improved or degraded my energy this week?",
    trajectoryLabel: "Protect the Engine",
  },
  {
    key: "face-reality",
    title: "Face Reality",
    summary: "Move toward truth instead of comfort.",
    failureMode: "Avoidance, perfectionism, planning instead of acting.",
    question: "What am I avoiding?",
    followUp: "What assumption did reality challenge this week?",
    trajectoryLabel: "Face Reality",
  },
  {
    key: "be-clear",
    title: "Be Clear",
    summary: "Seek understanding before being understood.",
    failureMode: "Assumptions, rambling, misunderstanding others.",
    question: "Where did communication break down this week?",
    followUp:
      "Where was I misunderstood, and where did I misunderstand someone else?",
    trajectoryLabel: "Be Clear",
  },
  {
    key: "keep-becoming",
    title: "Keep Becoming",
    summary: "Deliberately develop capability.",
    failureMode: "Stagnation, cynicism, loss of growth.",
    question: "How have I become more capable this week?",
    followUp: "What did I learn, apply, or improve this week?",
    trajectoryLabel: "Keep Becoming",
  },
  {
    key: "leave-them-better",
    title: "Leave Them Better Than You Found Them",
    summary: "Create positive impact through action.",
    failureMode: "Good intentions without execution.",
    question: "What did I leave better than I found it this week?",
    followUp: "What did I finish that positively impacted someone else?",
    trajectoryLabel: "Leave Them Better",
  },
  {
    key: "build-life-together",
    title: "Build a Life Together, Make Ordinary Special",
    summary: "Invest in relationships and shared experiences.",
    failureMode:
      "Neglect, avoidance of difficult conversations, resentment.",
    question: "How did we invest in our relationship this week?",
    followUp: "How did I help make ordinary life meaningful this week?",
    trajectoryLabel: "Life Together",
  },
  {
    key: "my-tribe",
    title: "My Tribe",
    summary: "Maintain meaningful connection with the people who matter.",
    failureMode: "Isolation, withdrawing when ashamed.",
    question: "Who did I meaningfully connect with this week?",
    followUp: "Who do I need to reach out to next week?",
    trajectoryLabel: "My Tribe",
  },
  {
    key: "choose-adventure",
    title: "Choose Adventure",
    summary: "Choose growth, exploration, and discomfort over stagnation.",
    failureMode: "Comfort, shrinking the world, becoming a spectator.",
    question: "What adventure did I choose this week?",
    followUp: "Where did I choose growth over comfort?",
    trajectoryLabel: "Adventure",
  },
];

export function emptyPrinciples(): PrincipleReview[] {
  return PRINCIPLES.map((p) => ({
    key: p.key,
    reflection: "",
    evidence: "",
    status: null,
    evaluationNote: "",
  }));
}

export function emptyWeeklyReflection(): WeeklyReflection {
  return {
    weekSummary: "",
    wins: "",
    attentionRequired: "",
    recurringPattern: "",
    theme: "",
    nextWeekCommitments: emptyNextWeekCommitments(),
    ...emptyLearningLoop(),
  };
}

export function emptyReviewMetadata(reviewDate = ""): ReviewMetadata {
  return {
    reviewDate,
    context: "",
    savedAt: null,
  };
}

const SCORE_BY_STATUS: Record<PrincipleStatus, number> = {
  yes: 1,
  somewhat: 0.5,
  no: 0,
};

export function statusLabel(status: PrincipleStatus | null): string {
  if (status === "yes") return "Yes";
  if (status === "somewhat") return "Somewhat";
  if (status === "no") return "No";
  return "—";
}

export function computeWeeklyScore(principles: PrincipleReview[]): {
  score: number;
  max: number;
} {
  const max = PRINCIPLES.length;
  let score = 0;
  for (const meta of PRINCIPLES) {
    const p = principles.find((x) => x.key === meta.key);
    if (p?.status) score += SCORE_BY_STATUS[p.status];
  }
  return { score, max };
}

export function formatWeeklyScore(score: number): string {
  return Number.isInteger(score) ? String(score) : score.toFixed(1);
}

export function statusEmoji(status: PrincipleStatus | null): string {
  if (status === "yes") return "🟢";
  if (status === "somewhat") return "🟡";
  if (status === "no") return "🔴";
  return "⬜";
}
