export type PrincipleKey =
  | "protect-the-engine"
  | "face-reality"
  | "keep-becoming"
  | "build-before-ready"
  | "invest-in-tribe"
  | "choose-adventure"
  | "leave-them-better";

export type PrincipleStatus = "yes" | "somewhat" | "no";

export type PrincipleReview = {
  key: PrincipleKey;
  reflection: string;
  status: PrincipleStatus | null;
};

export type FaultKey =
  | "isolation"
  | "overbuilding"
  | "bottling-emotions"
  | "performance-self-worth"
  | "catastrophizing"
  | "stopped-listening";

export type FaultsData = {
  selected: FaultKey[];
  whereShowedUp: string;
};

export const PRINCIPLES: {
  key: PrincipleKey;
  title: string;
  question: string;
  trajectoryLabel: string;
}[] = [
  {
    key: "protect-the-engine",
    title: "Protect the Engine",
    question: "Did I protect the engine this week?",
    trajectoryLabel: "Protect the Engine",
  },
  {
    key: "face-reality",
    title: "Face Reality",
    question: "What reality did I face this week?",
    trajectoryLabel: "Face Reality",
  },
  {
    key: "keep-becoming",
    title: "Keep Becoming",
    question: "How did I become more capable this week?",
    trajectoryLabel: "Keep Becoming",
  },
  {
    key: "build-before-ready",
    title: "Build Before You're Ready",
    question: "Where did I choose action over perfection?",
    trajectoryLabel: "Build Before You're Ready",
  },
  {
    key: "invest-in-tribe",
    title: "Invest In My Tribe",
    question: "Who did I intentionally invest in this week?",
    trajectoryLabel: "Tribe",
  },
  {
    key: "choose-adventure",
    title: "Choose Adventure",
    question: "Did I choose adventure this week?",
    trajectoryLabel: "Adventure",
  },
  {
    key: "leave-them-better",
    title: "Leave Them Better Than You Found Them",
    question: "Did I positively impact someone else's life this week?",
    trajectoryLabel: "Leave Them Better",
  },
];

export const FAULTS: { key: FaultKey; label: string }[] = [
  {
    key: "isolation",
    label: "Isolation instead of reality contact",
  },
  {
    key: "overbuilding",
    label: "Overbuilding instead of exposing work",
  },
  {
    key: "bottling-emotions",
    label: "Bottling emotions",
  },
  {
    key: "performance-self-worth",
    label: "Performance = self-worth",
  },
  {
    key: "catastrophizing",
    label: "Catastrophizing",
  },
  {
    key: "stopped-listening",
    label: "Stopped listening and started defending",
  },
];

export function emptyPrinciples(): PrincipleReview[] {
  return PRINCIPLES.map((p) => ({
    key: p.key,
    reflection: "",
    status: null,
  }));
}

export function emptyFaults(): FaultsData {
  return { selected: [], whereShowedUp: "" };
}

export function emptyCommitments(): [string, string, string] {
  return ["", "", ""];
}

export function statusEmoji(status: PrincipleStatus | null): string {
  if (status === "yes") return "🟢";
  if (status === "somewhat") return "🟡";
  if (status === "no") return "🔴";
  return "⬜";
}
