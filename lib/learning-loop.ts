/**
 * Part 2 — Close the Learning Loop (stored in weeklyReflection JSON).
 *
 * Future Model Database (design only — not built):
 * Each ModelUpdate already has a stable `id`. New updates also store `createdAt`.
 * Aggregation later can join on weekly review row id + these fields without
 * reshaping weekly JSON. Do not add categories, tags, search, or a global
 * model view until that product surface exists.
 */

export const MAX_MODEL_UPDATES = 3;

export type ModelUpdate = {
  id: string;
  previousBelief: string;
  updatedBelief: string;
  evidence: string;
  behaviorChange: string;
  /** ISO timestamp set on create — for future cross-review aggregation. */
  createdAt?: string;
};

export type LearningLoop = {
  weeklyDiagnosis: string;
  weeklyStrategy: string;
  modelUpdates: ModelUpdate[];
  noModelUpdateThisWeek: boolean;
  /** Optional overall note — kept in JSON; not shown in the compact scorecard UI. */
  assessmentNotes: string;
};

export function emptyModelUpdate(id?: string): ModelUpdate {
  return {
    id: id ?? createModelUpdateId(),
    previousBelief: "",
    updatedBelief: "",
    evidence: "",
    behaviorChange: "",
    createdAt: new Date().toISOString(),
  };
}

export function emptyLearningLoop(): LearningLoop {
  return {
    weeklyDiagnosis: "",
    weeklyStrategy: "",
    modelUpdates: [],
    noModelUpdateThisWeek: false,
    assessmentNotes: "",
  };
}

export function createModelUpdateId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `mu_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function modelUpdateHasSubstance(update: ModelUpdate): boolean {
  return Boolean(
    update.previousBelief.trim() ||
      update.updatedBelief.trim() ||
      update.evidence.trim() ||
      update.behaviorChange.trim(),
  );
}

export function parseModelUpdates(raw: unknown): ModelUpdate[] {
  if (!Array.isArray(raw)) return [];
  const updates: ModelUpdate[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const obj = item as Record<string, unknown>;
    updates.push({
      id:
        typeof obj.id === "string" && obj.id.trim()
          ? obj.id
          : createModelUpdateId(),
      previousBelief: String(obj.previousBelief ?? ""),
      updatedBelief: String(obj.updatedBelief ?? ""),
      evidence: String(obj.evidence ?? ""),
      behaviorChange: String(obj.behaviorChange ?? ""),
      createdAt:
        typeof obj.createdAt === "string" && obj.createdAt
          ? obj.createdAt
          : undefined,
    });
    if (updates.length >= MAX_MODEL_UPDATES) break;
  }
  return updates;
}

export function parseLearningLoop(raw: Record<string, unknown>): LearningLoop {
  return {
    weeklyDiagnosis: String(raw.weeklyDiagnosis ?? ""),
    weeklyStrategy: String(raw.weeklyStrategy ?? ""),
    modelUpdates: parseModelUpdates(raw.modelUpdates),
    noModelUpdateThisWeek: Boolean(raw.noModelUpdateThisWeek),
    assessmentNotes: String(raw.assessmentNotes ?? ""),
  };
}

export function learningLoopHasSubstance(loop: LearningLoop): boolean {
  return Boolean(
    loop.weeklyDiagnosis.trim() ||
      loop.weeklyStrategy.trim() ||
      loop.assessmentNotes.trim() ||
      loop.noModelUpdateThisWeek ||
      loop.modelUpdates.some(modelUpdateHasSubstance),
  );
}

/** Model-update requirement satisfied for synthesis. */
export function modelUpdatesSatisfied(loop: LearningLoop): boolean {
  if (loop.noModelUpdateThisWeek) return true;
  return loop.modelUpdates.some((u) => u.updatedBelief.trim().length > 0);
}
