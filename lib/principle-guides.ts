import { PRINCIPLES, type PrincipleKey } from "@/lib/principles";

export type PrincipleGuide = {
  id: PrincipleKey;
  fullTitle: string;
  shortDefinition: string;
  personalMeaning: string;
  failureMode: string;
  evidenceExamples: string[];
  reflectionPrompts: string[];
  anchor: string;
};

const GUIDES: Record<PrincipleKey, Omit<PrincipleGuide, "id" | "failureMode">> =
  {
    "protect-the-engine": {
      fullTitle: "Protect the Engine",
      shortDefinition:
        "Treat your body and mind as the foundation for everything else.",
      personalMeaning:
        "If the engine is depleted, every other principle suffers. Sleep, movement, food, and recovery are not optional extras — they are the operating system.",
      evidenceExamples: [
        "Sleep quality and consistency",
        "Workouts completed or intentionally rested",
        "Substance use that helped or hurt recovery",
        "Energy level across the week",
      ],
      reflectionPrompts: [
        "Did I treat my body and mind like an asset or a liability this week?",
        "What improved or degraded my energy?",
        "Where did I choose short-term comfort over recovery?",
      ],
      anchor:
        "You cannot become who you want to become on a broken engine. Protect capacity first.",
    },
    "face-reality": {
      fullTitle: "Face Reality",
      shortDefinition: "Move toward truth instead of comfort.",
      personalMeaning:
        "Avoidance feels like safety but quietly shrinks your life. Facing reality means naming what is true — especially when it is inconvenient — and acting on it.",
      evidenceExamples: [
        "A hard conversation you had or delayed",
        "A decision made with incomplete certainty",
        "A plan replaced by a concrete next action",
        "An assumption that reality disproved",
      ],
      reflectionPrompts: [
        "What am I avoiding?",
        "What assumption did reality challenge this week?",
        "Where did I choose planning over contact with the real situation?",
      ],
      anchor:
        "Comfort protects the ego. Reality protects the future. Choose contact over avoidance.",
    },
    "be-clear": {
      fullTitle: "Be Clear",
      shortDefinition: "Seek understanding before being understood.",
      personalMeaning:
        "Clarity is care. Ambiguity creates friction in relationships and work. Being clear means saying what you mean, listening fully, and checking for shared understanding.",
      evidenceExamples: [
        "A conversation that landed cleanly",
        "A misunderstanding you repaired",
        "A request stated without hedging",
        "A moment you asked before assuming",
      ],
      reflectionPrompts: [
        "Where did communication break down this week?",
        "Where was I misunderstood, and where did I misunderstand someone else?",
        "What did I leave unsaid that needed saying?",
      ],
      anchor:
        "Clear is kind. Unclear is expensive — for you and for the people you love.",
    },
    "keep-becoming": {
      fullTitle: "Keep Becoming",
      shortDefinition: "Deliberately develop capability.",
      personalMeaning:
        "Identity is built through practice, not intention. Keep Becoming means choosing growth on purpose — learning, shipping, and becoming more capable than last week.",
      evidenceExamples: [
        "A skill practiced or applied",
        "Work finished that raised your capability",
        "Feedback you sought or used",
        "A stretch task you took on",
      ],
      reflectionPrompts: [
        "How have I become more capable this week?",
        "What did I learn, apply, or improve?",
        "Where did I stagnate when growth was available?",
      ],
      anchor:
        "You are either becoming or drifting. Deliberate practice is how you stay in motion.",
    },
    "leave-them-better": {
      fullTitle: "Leave Them Better Than You Found Them",
      shortDefinition: "Create positive impact through action.",
      personalMeaning:
        "Good intentions do not count. This principle is about finished impact — something concrete that made another person's life better because you acted.",
      evidenceExamples: [
        "Something finished that helped someone",
        "Support offered without being asked",
        "A contribution that reduced friction for others",
        "A promise kept that mattered to someone else",
      ],
      reflectionPrompts: [
        "What did I leave better than I found it this week?",
        "What did I finish that positively impacted someone else?",
        "Where did intention replace execution?",
      ],
      anchor:
        "Impact requires completion. Leave evidence that someone is better because you showed up.",
    },
    "build-life-together": {
      fullTitle: "Build a Life Together, Make Ordinary Special",
      shortDefinition: "Invest in relationships and shared experiences.",
      personalMeaning:
        "A shared life is built in ordinary moments — attention, warmth, difficult conversations, and rituals that make the everyday feel chosen rather than endured.",
      evidenceExamples: [
        "Quality time that was intentional, not leftover",
        "A difficult conversation handled with care",
        "A small ritual that made ordinary life warmer",
        "Repair after distance or tension",
      ],
      reflectionPrompts: [
        "How did we invest in our relationship this week?",
        "How did I help make ordinary life meaningful?",
        "Where did I withdraw when presence was needed?",
      ],
      anchor:
        "Love is not only the big moments. Make ordinary life feel like something you are building on purpose.",
    },
    "my-tribe": {
      fullTitle: "My Tribe",
      shortDefinition:
        "Maintain meaningful connection with the people who matter.",
      personalMeaning:
        "Isolation grows when shame or busyness wins. My Tribe means staying in contact with the people who matter — especially when it would be easier to disappear.",
      evidenceExamples: [
        "A meaningful check-in or conversation",
        "Outreach to someone you had been avoiding",
        "Presence offered when someone needed you",
        "Community you joined instead of withdrawing",
      ],
      reflectionPrompts: [
        "Who did I meaningfully connect with this week?",
        "Who do I need to reach out to?",
        "Where did I withdraw when connection was available?",
      ],
      anchor:
        "Belonging requires contact. Do not disappear when shame or pressure shows up.",
    },
    "choose-adventure": {
      fullTitle: "Choose Adventure",
      shortDefinition:
        "Choose growth, exploration, and discomfort over stagnation.",
      personalMeaning:
        "Adventure is not recklessness. It is the refusal to shrink — choosing novelty, courage, and aliveness when comfort would keep your world small.",
      evidenceExamples: [
        "A discomfort you entered on purpose",
        "A new experience, place, or challenge",
        "A risk taken in service of growth",
        "A moment you chose participation over watching",
      ],
      reflectionPrompts: [
        "What adventure did I choose this week?",
        "Where did I choose growth over comfort?",
        "Where did I shrink when life asked me to expand?",
      ],
      anchor:
        "A small life is the default. Adventure is a choice — choose the larger room.",
    },
  };

export const PRINCIPLE_GUIDES: PrincipleGuide[] = PRINCIPLES.map((meta) => {
  const guide = GUIDES[meta.key];
  return {
    id: meta.key,
    fullTitle: guide.fullTitle,
    shortDefinition: guide.shortDefinition,
    personalMeaning: guide.personalMeaning,
    failureMode: meta.failureMode,
    evidenceExamples: guide.evidenceExamples,
    reflectionPrompts: guide.reflectionPrompts,
    anchor: guide.anchor,
  };
});

export function getPrincipleGuide(
  key: PrincipleKey,
): PrincipleGuide | undefined {
  return PRINCIPLE_GUIDES.find((g) => g.id === key);
}
