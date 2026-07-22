"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  saveWeeklyReview,
  submitWeeklyReview,
  refreshPreviousCommitmentsFromPriorReview,
} from "@/app/actions";
import {
  computeCommitmentScore,
  formatCommitmentScore,
  formatPreviousCommitmentSourceRange,
  previousCommitmentsHaveStatuses,
  PREVIOUS_COMMITMENT_STATUSES,
  type PreviousCommitmentStatus,
} from "@/lib/commitments";
import { DailyNotesSection } from "@/components/DailyNotesSection";
import { PrincipleGuideButton } from "@/components/PrincipleGuideButton";
import { SectionHeader, WorkspaceZone } from "@/components/SectionHeader";
import {
  createModelUpdateId,
  emptyModelUpdate,
  learningLoopHasSubstance,
  MAX_MODEL_UPDATES,
  modelUpdateHasSubstance,
  type ModelUpdate,
} from "@/lib/learning-loop";
import {
  PRINCIPLES,
  computeWeeklyScore,
  formatWeeklyScore,
  statusLabel,
  type PrincipleKey,
  type PrincipleStatus,
} from "@/lib/principles";
import type { DailyNoteData } from "@/lib/daily-notes";
import { formatWeeklyCompassForClipboard } from "@/lib/format-weekly-compass";
import {
  isPart1Complete,
  isSynthesisComplete,
  type WeeklyReviewSummary,
} from "@/lib/reviews";
import { formatWeekRange } from "@/lib/week";

const AUTOSAVE_DELAY_MS = 1200;

type FormState = WeeklyReviewSummary;

function buildState(review: WeeklyReviewSummary): FormState {
  return structuredClone(review);
}

function formatSavedTimestamp(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function WeeklyReviewForm({
  review,
  defaultReviewDate,
  today,
  isComplete = false,
  previousCommitmentsStale = false,
  dailyNotes: initialDailyNotes = [],
  isCurrentWeek = true,
}: {
  review: WeeklyReviewSummary;
  defaultReviewDate: string;
  today: string;
  isComplete?: boolean;
  previousCommitmentsStale?: boolean;
  dailyNotes?: DailyNoteData[];
  isCurrentWeek?: boolean;
}) {
  const [state, setState] = useState<FormState>(() => buildState(review));
  const [liveDailyNotes, setLiveDailyNotes] = useState(initialDailyNotes);
  const [saveError, setSaveError] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copyNotice, setCopyNotice] = useState<string | null>(null);
  const [copyError, setCopyError] = useState(false);
  const [isCopying, setIsCopying] = useState(false);
  const [part2Open, setPart2Open] = useState(() =>
    learningLoopHasSubstance(review.weeklyReflection),
  );
  const [saveNotice, setSaveNotice] = useState<{
    message: string;
    savedAt: string;
  } | null>(() =>
    review.reviewMetadata.savedAt
      ? {
          message: isComplete ? "Review Completed" : "Weekly Review Saved",
          savedAt: review.reviewMetadata.savedAt,
        }
      : null,
  );
  const [isRefreshingCommitments, setIsRefreshingCommitments] = useState(false);
  const copyNoticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dailyNotesRef = useRef(liveDailyNotes);
  dailyNotesRef.current = liveDailyNotes;
  const stateRef = useRef(state);
  const lastSavedRef = useRef(JSON.stringify(review));
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  stateRef.current = state;

  const { score, max } = computeWeeklyScore(state.principles);
  const commitmentScore = computeCommitmentScore(state.previousCommitments);
  const sourceRange = formatPreviousCommitmentSourceRange(
    state.previousCommitments,
  );
  const part1Ready = isPart1Complete(state);
  const synthesisReady = isSynthesisComplete(state);

  useEffect(() => {
    const next = buildState(review);
    setState(next);
    lastSavedRef.current = JSON.stringify(review);
    stateRef.current = next;
    setLiveDailyNotes(initialDailyNotes);
    dailyNotesRef.current = initialDailyNotes;
    setSaveError(false);
    setIsSaving(false);
    setCopyNotice(null);
    setCopyError(false);
    setPart2Open(learningLoopHasSubstance(review.weeklyReflection));
    setSaveNotice(
      review.reviewMetadata.savedAt
        ? {
            message: isComplete ? "Review Completed" : "Weekly Review Saved",
            savedAt: review.reviewMetadata.savedAt,
          }
        : null,
    );
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- hydrate on week change only
  }, [review.weekStart]);

  const buildPayload = useCallback((next: FormState) => ({
    principles: Object.fromEntries(
      next.principles.map((p) => [p.key, p]),
    ) as Partial<
      Record<
        PrincipleKey,
        {
          reflection: string;
          evidence: string;
          status: PrincipleStatus | null;
          evaluationNote: string;
        }
      >
    >,
    weeklyReflection: next.weeklyReflection,
    reviewMetadata: next.reviewMetadata,
    previousCommitments: next.previousCommitments,
  }), []);

  const persist = useCallback(
    (next: FormState) => {
      setIsSaving(true);
      return saveWeeklyReview(next.weekStart, buildPayload(next))
        .then((result) => {
          if (!result.ok) throw new Error(result.error);
          lastSavedRef.current = JSON.stringify(next);
          setSaveError(false);
        })
        .catch(() => setSaveError(true))
        .finally(() => setIsSaving(false));
    },
    [buildPayload],
  );

  const scheduleSave = useCallback(
    (next: FormState) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        void persist(next);
      }, AUTOSAVE_DELAY_MS);
    },
    [persist],
  );

  const updateReflection = useCallback(
    (patch: Partial<FormState["weeklyReflection"]>) => {
      setState((prev) => {
        const next = {
          ...prev,
          weeklyReflection: { ...prev.weeklyReflection, ...patch },
        };
        stateRef.current = next;
        scheduleSave(next);
        return next;
      });
    },
    [scheduleSave],
  );

  const updateMetadata = useCallback(
    (patch: Partial<FormState["reviewMetadata"]>) => {
      setState((prev) => {
        const next = {
          ...prev,
          reviewMetadata: { ...prev.reviewMetadata, ...patch },
        };
        stateRef.current = next;
        scheduleSave(next);
        return next;
      });
    },
    [scheduleSave],
  );

  const updatePrinciple = useCallback(
    (key: PrincipleKey, patch: Partial<FormState["principles"][number]>) => {
      setState((prev) => {
        const next = {
          ...prev,
          principles: prev.principles.map((p) =>
            p.key === key ? { ...p, ...patch } : p,
          ),
        };
        stateRef.current = next;
        scheduleSave(next);
        return next;
      });
    },
    [scheduleSave],
  );

  const setPreviousCommitmentStatus = useCallback(
    (index: number, status: PreviousCommitmentStatus) => {
      setState((prev) => {
        const next = {
          ...prev,
          previousCommitments: prev.previousCommitments.map((item, i) =>
            i === index ? { ...item, status } : item,
          ),
        };
        stateRef.current = next;
        scheduleSave(next);
        return next;
      });
    },
    [scheduleSave],
  );

  const handleRefreshPreviousCommitments = useCallback(async () => {
    const hasStatuses = previousCommitmentsHaveStatuses(
      stateRef.current.previousCommitments,
    );
    if (
      hasStatuses &&
      !window.confirm(
        "Refreshing will replace your current previous commitments and clear any completion statuses. Continue?",
      )
    ) {
      return;
    }

    setIsRefreshingCommitments(true);
    setSaveError(false);
    try {
      const result = await refreshPreviousCommitmentsFromPriorReview(
        stateRef.current.weekStart,
        defaultReviewDate,
      );
      if (!result.ok) throw new Error(result.error);

      setState((prev) => {
        const next = {
          ...prev,
          previousCommitments: result.previousCommitments,
        };
        stateRef.current = next;
        lastSavedRef.current = JSON.stringify(next);
        return next;
      });
    } catch {
      setSaveError(true);
    } finally {
      setIsRefreshingCommitments(false);
    }
  }, [defaultReviewDate]);

  const flushSave = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    const current = JSON.stringify(stateRef.current);
    if (current !== lastSavedRef.current) {
      void persist(stateRef.current);
    }
  }, [persist]);

  const handleSubmit = useCallback(async () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setIsSubmitting(true);
    setSaveError(false);
    try {
      const result = await submitWeeklyReview(
        stateRef.current.weekStart,
        buildPayload(stateRef.current),
        defaultReviewDate,
      );
      if (!result.ok) throw new Error(result.error);

      let message = result.message;
      if (result.isComplete || isSynthesisComplete(stateRef.current)) {
        message = "Review Completed";
      } else if (isPart1Complete(stateRef.current)) {
        message = "Review ready for mentor";
      }

      if (result.savedAt) {
        setSaveNotice({ message, savedAt: result.savedAt });
        setState((prev) => ({
          ...prev,
          reviewMetadata: {
            ...prev.reviewMetadata,
            savedAt: result.savedAt,
          },
        }));
      }
      lastSavedRef.current = JSON.stringify(stateRef.current);
    } catch {
      setSaveError(true);
    } finally {
      setIsSubmitting(false);
    }
  }, [buildPayload, defaultReviewDate]);

  const handleCopyReviewForMentor = useCallback(async () => {
    setIsCopying(true);
    setCopyError(false);
    setCopyNotice(null);
    try {
      const text = formatWeeklyCompassForClipboard(stateRef.current);
      await navigator.clipboard.writeText(text);
      setCopyNotice("Review copied for mentor");
      if (copyNoticeTimerRef.current) clearTimeout(copyNoticeTimerRef.current);
      copyNoticeTimerRef.current = setTimeout(() => {
        setCopyNotice(null);
        copyNoticeTimerRef.current = null;
      }, 2500);
    } catch {
      setCopyError(true);
    } finally {
      setIsCopying(false);
    }
  }, []);

  const addModelUpdate = useCallback(() => {
    setState((prev) => {
      if (prev.weeklyReflection.modelUpdates.length >= MAX_MODEL_UPDATES) {
        return prev;
      }
      const next = {
        ...prev,
        weeklyReflection: {
          ...prev.weeklyReflection,
          noModelUpdateThisWeek: false,
          modelUpdates: [
            ...prev.weeklyReflection.modelUpdates,
            emptyModelUpdate(createModelUpdateId()),
          ],
        },
      };
      stateRef.current = next;
      scheduleSave(next);
      return next;
    });
  }, [scheduleSave]);

  const updateModelUpdate = useCallback(
    (id: string, patch: Partial<ModelUpdate>) => {
      setState((prev) => {
        const next = {
          ...prev,
          weeklyReflection: {
            ...prev.weeklyReflection,
            modelUpdates: prev.weeklyReflection.modelUpdates.map((u) =>
              u.id === id ? { ...u, ...patch } : u,
            ),
          },
        };
        stateRef.current = next;
        scheduleSave(next);
        return next;
      });
    },
    [scheduleSave],
  );

  const removeModelUpdate = useCallback(
    (id: string) => {
      setState((prev) => {
        const next = {
          ...prev,
          weeklyReflection: {
            ...prev.weeklyReflection,
            modelUpdates: prev.weeklyReflection.modelUpdates.filter(
              (u) => u.id !== id,
            ),
          },
        };
        stateRef.current = next;
        scheduleSave(next);
        return next;
      });
    },
    [scheduleSave],
  );

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (copyNoticeTimerRef.current) clearTimeout(copyNoticeTimerRef.current);
      const current = JSON.stringify(stateRef.current);
      if (current !== lastSavedRef.current) {
        void persist(stateRef.current);
      }
    };
  }, [review.weekStart, persist]);

  return (
    <div className="flex flex-col gap-16 sm:gap-20">
      <WorkspaceZone>
        <SectionHeader
          eyebrow="Daily Notes"
          subtitle="Capture what is happening while it is happening."
        />
        <DailyNotesSection
          weekStart={review.weekStart}
          notes={liveDailyNotes}
          today={today}
          isCurrentWeek={isCurrentWeek}
          onNotesChange={(next) => {
            setLiveDailyNotes(next);
            dailyNotesRef.current = next;
          }}
        />
      </WorkspaceZone>

      {/* ─── PART 1 ─── */}
      <WorkspaceZone className="border-t border-line-subtle pt-14 sm:pt-16">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-ink-faint">
            Weekly Compass
          </p>
          <h2 className="mt-2 font-serif text-2xl tracking-tight text-ink sm:text-3xl">
            Part 1 — Review the Week
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink-soft">
            Capture your own perspective before discussing the week with your
            mentor.
          </p>
          {part1Ready && (
            <p className="mt-2 text-xs uppercase tracking-[0.14em] text-ink-faint">
              Ready for mentor
            </p>
          )}
        </div>

        <form
          className="mt-7 flex flex-col gap-7 sm:gap-8"
          onSubmit={(e) => e.preventDefault()}
        >
          <section className="rounded-xl border border-line-subtle bg-white px-4 py-4 shadow-soft sm:px-5 sm:py-5">
            <p className="text-xs uppercase tracking-[0.2em] text-ink-faint">
              Review Metadata
            </p>
            <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:gap-5">
              <Field label="Review Date" className="sm:w-48 sm:shrink-0">
                <input
                  type="date"
                  value={state.reviewMetadata.reviewDate || defaultReviewDate}
                  onChange={(e) =>
                    updateMetadata({ reviewDate: e.target.value })
                  }
                  onBlur={flushSave}
                  className={inputClass}
                />
              </Field>
              <Field
                label="Context"
                className="min-w-0 flex-1"
              >
                <textarea
                  value={state.reviewMetadata.context}
                  onChange={(e) => updateMetadata({ context: e.target.value })}
                  onBlur={flushSave}
                  rows={2}
                  placeholder="Completing on Thursday, just returned from a trip…"
                  className={textareaClass}
                />
              </Field>
            </div>
          </section>

          {/* 2. Current-week commitment review */}
          <section className="rounded-xl border border-line-subtle bg-white px-4 py-5 shadow-soft sm:px-6 sm:py-6">
            <p className="text-xs uppercase tracking-[0.2em] text-ink-faint">
              Current-Week Commitment Review
            </p>
            <p className="mt-2 text-sm text-ink-soft">
              How did you do on the commitments that belonged to this week?
            </p>

            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              {sourceRange ? (
                <p className="text-xs text-ink-faint">From {sourceRange}</p>
              ) : (
                <p className="text-xs text-ink-faint">
                  No commitments found for this week.
                </p>
              )}
              <button
                type="button"
                onClick={() => void handleRefreshPreviousCommitments()}
                disabled={isRefreshingCommitments || isSaving}
                className="shrink-0 rounded-lg border border-line-subtle px-3 py-1.5 text-xs uppercase tracking-[0.12em] text-ink-soft transition-colors hover:border-stone-300 hover:text-ink disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isRefreshingCommitments
                  ? "Refreshing…"
                  : "Refresh from previous review"}
              </button>
            </div>

            {previousCommitmentsStale && (
              <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-900">
                These commitments are from an older review. Use{" "}
                <span className="font-medium">
                  Refresh from previous review
                </span>{" "}
                to pull from your latest completed week.
              </p>
            )}

            {commitmentScore.total > 0 && (
              <p className="mt-3 text-sm text-ink-soft">
                Commitment Score:{" "}
                <span className="font-medium text-ink">
                  {formatCommitmentScore(
                    commitmentScore.score,
                    commitmentScore.total,
                  )}{" "}
                  completed
                </span>
              </p>
            )}

            {state.previousCommitments.length > 0 ? (
              <ul className="mt-5 flex flex-col gap-3.5">
                {state.previousCommitments.map((item, index) => (
                  <li
                    key={item.id}
                    className="flex flex-col gap-2 border-b border-line-subtle/80 pb-3.5 last:border-b-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between sm:gap-6"
                  >
                    <p className="text-[15px] leading-snug text-ink">
                      {item.status === "completed" ? "☑" : "☐"}{" "}
                      <span className="font-serif">{item.text}</span>
                    </p>
                    <div className="flex flex-wrap gap-2 sm:shrink-0">
                      {PREVIOUS_COMMITMENT_STATUSES.map(({ value, label }) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => {
                            setPreviousCommitmentStatus(index, value);
                            flushSave();
                          }}
                          className={[
                            "min-h-[2rem] rounded-lg border px-3 py-1.5 text-xs uppercase tracking-[0.12em]",
                            item.status === value
                              ? "border-stone-400 bg-stone-100 text-ink"
                              : "border-line-subtle text-ink-faint hover:border-stone-300",
                          ].join(" ")}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
            ) : null}
          </section>

          {/* 3. Principle Reflections */}
          <div>
            <ModeLabel mode="Reflection" title="Principle Reflections" />
            <p className="mt-2 text-sm text-ink-soft">
              How each principle showed up this week — from your perspective.
            </p>
            <ul className="mt-4 flex flex-col gap-4">
              {PRINCIPLES.map((meta) => {
                const p = state.principles.find((x) => x.key === meta.key)!;
                return (
                  <li
                    key={meta.key}
                    className="rounded-xl border border-line-subtle bg-white px-4 py-5 shadow-soft sm:px-6 sm:py-5"
                  >
                    <div className="flex items-center gap-2.5">
                      <h3 className="font-serif text-xl tracking-tight text-ink sm:text-2xl">
                        {meta.title}
                      </h3>
                      <PrincipleGuideButton
                        principleKey={meta.key}
                        title={meta.title}
                      />
                    </div>
                    <textarea
                      value={p.reflection}
                      onChange={(e) =>
                        updatePrinciple(meta.key, {
                          reflection: e.target.value,
                        })
                      }
                      onBlur={flushSave}
                      rows={3}
                      placeholder="How did this principle show up? What stood out?"
                      className={`${textareaClass} mt-4`}
                      aria-label={`${meta.title} reflection`}
                    />
                  </li>
                );
              })}
            </ul>
          </div>

          {/* 4. Weekly Reflection */}
          <section className="rounded-xl border border-line-subtle bg-white px-4 py-5 shadow-soft sm:px-6 sm:py-6">
            <ModeLabel mode="Reflection" title="Weekly Reflection" />
            <p className="mt-2 text-sm text-ink-soft">
              Capture your own perspective before discussing the week with your
              mentor.
            </p>

            <div className="mt-5 flex flex-col gap-5">
              <Field
                label="Week Summary"
                hint="What happened this week from your perspective?"
              >
                <textarea
                  value={state.weeklyReflection.weekSummary}
                  onChange={(e) =>
                    updateReflection({ weekSummary: e.target.value })
                  }
                  onBlur={flushSave}
                  rows={3}
                  className={textareaClass}
                />
              </Field>

              <Field
                label="Wins"
                hint="What are you proud of from this week?"
              >
                <textarea
                  value={state.weeklyReflection.wins}
                  onChange={(e) => updateReflection({ wins: e.target.value })}
                  onBlur={flushSave}
                  rows={3}
                  className={textareaClass}
                />
              </Field>

              <Field label="Attention Required" hint="What needs attention?">
                <textarea
                  value={state.weeklyReflection.attentionRequired}
                  onChange={(e) =>
                    updateReflection({ attentionRequired: e.target.value })
                  }
                  onBlur={flushSave}
                  rows={3}
                  className={textareaClass}
                />
              </Field>

              <Field
                label="Recurring Patterns"
                hint="What patterns did you notice?"
              >
                <textarea
                  value={state.weeklyReflection.recurringPattern}
                  onChange={(e) =>
                    updateReflection({ recurringPattern: e.target.value })
                  }
                  onBlur={flushSave}
                  rows={3}
                  className={textareaClass}
                />
              </Field>

              <Field
                label="Theme of the Week"
                hint="What felt like the central theme of the week?"
              >
                <textarea
                  value={state.weeklyReflection.theme}
                  onChange={(e) => updateReflection({ theme: e.target.value })}
                  onBlur={flushSave}
                  rows={2}
                  className={textareaClass}
                />
              </Field>
            </div>
          </section>

          {/* 5. Copy Review for Mentor */}
          <div className="flex flex-col gap-2 border-t border-line-subtle pt-6">
            <button
              type="button"
              onClick={() => void handleCopyReviewForMentor()}
              disabled={isCopying}
              className="inline-flex items-center justify-center rounded-xl border border-line-subtle bg-white px-6 py-3 text-sm font-medium tracking-wide text-ink-soft transition-colors hover:border-stone-300 hover:text-ink disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isCopying ? "Copying…" : "Copy Review for Mentor"}
            </button>
            {copyNotice && (
              <p className="text-sm text-ink-soft" aria-live="polite">
                {copyNotice}
              </p>
            )}
            {copyError && (
              <p
                className="text-xs tracking-wide text-red-700"
                aria-live="polite"
              >
                Could not copy. Check clipboard permissions and try again.
              </p>
            )}
            <p className="text-xs text-ink-faint">
              Copies Part 1 only — ready for the mentor conversation.
            </p>
          </div>
        </form>
      </WorkspaceZone>

      {/* ─── PART 2 ─── */}
      <WorkspaceZone className="border-t border-line-subtle pt-14 sm:pt-16">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-ink-faint">
              Weekly Compass
            </p>
            <h2 className="mt-2 font-serif text-2xl tracking-tight text-ink sm:text-3xl">
              Part 2 — Close the Learning Loop
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink-soft">
              Record what emerged from the mentor conversation and decide how to
              operate next week.
            </p>
            {synthesisReady && (
              <p className="mt-2 text-xs uppercase tracking-[0.14em] text-ink-faint">
                Synthesis complete
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => setPart2Open((o) => !o)}
            className="shrink-0 self-start rounded-lg border border-line-subtle px-3 py-1.5 text-xs uppercase tracking-[0.12em] text-ink-soft transition-colors hover:border-stone-300 hover:text-ink"
          >
            {part2Open ? "Collapse" : "Expand"}
          </button>
        </div>

        {part2Open ? (
          <form
            className="mt-7 flex flex-col gap-7 sm:gap-8"
            onSubmit={(e) => e.preventDefault()}
          >
            {/* Weekly Diagnosis — centerpiece */}
            <section className="rounded-2xl border border-stone-300 bg-stone-50/80 px-5 py-6 shadow-soft sm:px-8 sm:py-8">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <ModeLabel mode="Diagnosis" title="Weekly Diagnosis" />
                <span className="rounded border border-stone-300/80 bg-white px-2 py-0.5 text-[10px] uppercase tracking-[0.16em] text-ink-faint">
                  Key Synthesis
                </span>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-ink-soft">
                Capture the best current interpretation after discussing the
                week with your mentor.
              </p>
              <p className="mt-4 font-serif text-base text-ink sm:text-lg">
                What was this week really about beneath the surface?
              </p>
              <textarea
                value={state.weeklyReflection.weeklyDiagnosis}
                onChange={(e) =>
                  updateReflection({ weeklyDiagnosis: e.target.value })
                }
                onBlur={flushSave}
                rows={10}
                placeholder="Write 3–6 short paragraphs…"
                className={[
                  textareaClass,
                  "mt-4 min-h-[14rem] border-stone-300/90 bg-white text-[16px] leading-relaxed",
                ].join(" ")}
                aria-label="Weekly Diagnosis"
              />
            </section>

            {/* Principle Assessment */}
            <section className="rounded-xl border border-line-subtle bg-white px-4 py-5 shadow-soft sm:px-6 sm:py-5">
              <ModeLabel mode="Assessment" title="Principle Assessment" />
              <p className="mt-2 text-sm text-ink-soft">
                After the mentor conversation, assess how well you actually
                lived each principle.
              </p>

              <ul className="mt-5 divide-y divide-line-subtle/80">
                {PRINCIPLES.map((meta) => {
                  const p = state.principles.find((x) => x.key === meta.key)!;
                  return (
                    <li
                      key={meta.key}
                      className="flex flex-col gap-2.5 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
                    >
                      <span className="min-w-0 font-serif text-[15px] leading-snug text-ink">
                        {meta.trajectoryLabel}
                      </span>
                      <div className="flex flex-wrap gap-2 sm:shrink-0">
                        {(["yes", "somewhat", "no"] as const).map((status) => (
                          <button
                            key={status}
                            type="button"
                            onClick={() => {
                              updatePrinciple(meta.key, {
                                status: p.status === status ? null : status,
                              });
                              flushSave();
                            }}
                            className={[
                              "min-h-[2.25rem] rounded-md border px-3 py-1.5 text-xs uppercase tracking-[0.12em] transition-colors",
                              p.status === status
                                ? "border-stone-400 bg-stone-100 text-ink"
                                : "border-line-subtle text-ink-faint hover:border-stone-300 hover:text-ink-soft",
                            ].join(" ")}
                          >
                            {statusLabel(status)}
                          </button>
                        ))}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>

            <WeeklyScoreSummary
              weekDate={formatWeekRange(review.weekStart)}
              score={score}
              max={max}
              principles={state.principles}
            />

            {/* Model Updates */}
            <section className="rounded-xl border border-stone-300/70 bg-white px-4 py-5 shadow-soft sm:px-6 sm:py-6">
              <ModeLabel mode="Learning" title="Model Updates" />
              <p className="mt-2 text-sm text-ink-soft">
                Capture durable changes in how you understand yourself or the
                world.
              </p>

              <label className="mt-4 flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  checked={state.weeklyReflection.noModelUpdateThisWeek}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setState((prev) => {
                      const next = {
                        ...prev,
                        weeklyReflection: {
                          ...prev.weeklyReflection,
                          noModelUpdateThisWeek: checked,
                          modelUpdates: checked
                            ? prev.weeklyReflection.modelUpdates.filter(
                                modelUpdateHasSubstance,
                              )
                            : prev.weeklyReflection.modelUpdates,
                        },
                      };
                      stateRef.current = next;
                      scheduleSave(next);
                      return next;
                    });
                  }}
                  className="mt-1"
                />
                <span className="text-sm text-ink-soft">
                  No meaningful model update this week.
                </span>
              </label>

              {!state.weeklyReflection.noModelUpdateThisWeek && (
                <div className="mt-5 flex flex-col gap-5">
                  {state.weeklyReflection.modelUpdates.map((update, index) => (
                    <div
                      key={update.id}
                      className="rounded-lg border border-line-subtle bg-stone-50/50 px-4 py-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-xs uppercase tracking-[0.14em] text-ink-faint">
                          Update {index + 1}
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            removeModelUpdate(update.id);
                            flushSave();
                          }}
                          className="text-xs text-ink-faint hover:text-ink-soft"
                        >
                          Remove
                        </button>
                      </div>
                      <div className="mt-3 flex flex-col gap-3.5">
                        <Field
                          label="Previous Belief"
                          hint="What did you believe before?"
                        >
                          <textarea
                            value={update.previousBelief}
                            onChange={(e) =>
                              updateModelUpdate(update.id, {
                                previousBelief: e.target.value,
                              })
                            }
                            onBlur={flushSave}
                            rows={2}
                            className={textareaClass}
                          />
                        </Field>
                        <Field
                          label="Updated Belief"
                          hint="What do you now believe? Make it useful beyond this week."
                        >
                          <textarea
                            value={update.updatedBelief}
                            onChange={(e) =>
                              updateModelUpdate(update.id, {
                                updatedBelief: e.target.value,
                              })
                            }
                            onBlur={flushSave}
                            rows={2}
                            className={textareaClass}
                          />
                        </Field>
                        <Field
                          label="Evidence"
                          hint="What happened that supports this update?"
                        >
                          <textarea
                            value={update.evidence}
                            onChange={(e) =>
                              updateModelUpdate(update.id, {
                                evidence: e.target.value,
                              })
                            }
                            onBlur={flushSave}
                            rows={2}
                            className={textareaClass}
                          />
                        </Field>
                        <Field
                          label="Behavior Change"
                          hint="What should you now do differently?"
                        >
                          <textarea
                            value={update.behaviorChange}
                            onChange={(e) =>
                              updateModelUpdate(update.id, {
                                behaviorChange: e.target.value,
                              })
                            }
                            onBlur={flushSave}
                            rows={2}
                            className={textareaClass}
                          />
                        </Field>
                      </div>
                    </div>
                  ))}

                  {state.weeklyReflection.modelUpdates.length <
                    MAX_MODEL_UPDATES && (
                    <button
                      type="button"
                      onClick={() => {
                        addModelUpdate();
                        flushSave();
                      }}
                      className="self-start rounded-lg border border-line-subtle px-3 py-1.5 text-xs uppercase tracking-[0.12em] text-ink-soft transition-colors hover:border-stone-300 hover:text-ink"
                    >
                      Add model update
                    </button>
                  )}
                </div>
              )}
            </section>

            {/* Weekly Strategy */}
            <section className="rounded-xl border border-stone-300/70 bg-white px-4 py-5 shadow-soft sm:px-6 sm:py-6">
              <ModeLabel mode="Execution" title="Weekly Strategy" />
              <p className="mt-2 text-sm text-ink-soft">
                Write a short operating approach, not a task list.
              </p>
              <p className="mt-3 text-xs text-ink-faint">
                How will you operate differently next week?
              </p>
              <textarea
                value={state.weeklyReflection.weeklyStrategy}
                onChange={(e) =>
                  updateReflection({ weeklyStrategy: e.target.value })
                }
                onBlur={flushSave}
                rows={2}
                className={`${textareaClass} mt-2 max-w-2xl`}
                aria-label="Weekly Strategy"
              />
              <p className="mt-3 text-[11px] leading-relaxed text-ink-faint/90">
                Examples: Protect mornings before reacting · Prioritize
                consistency over intensity · Slow down conflict before making
                permanent decisions
              </p>
            </section>

            {/* Weekly Commitments */}
            <section className="rounded-xl border border-stone-300/70 bg-white px-4 py-5 shadow-soft sm:px-6 sm:py-6">
              <ModeLabel mode="Execution" title="Weekly Commitments" />
              <p className="mt-2 text-sm text-ink-soft">
                What commitments would prove I lived this week&apos;s strategy?
              </p>
              <p className="mt-1 text-xs text-ink-faint">
                Short, actionable, measurable.
              </p>
              <ol className="mt-4 flex flex-col gap-2.5">
                {state.weeklyReflection.nextWeekCommitments.map(
                  (commitment, i) => (
                    <li key={commitment.id} className="flex items-start gap-3">
                      <span className="mt-2.5 font-serif text-lg text-ink-faint">
                        {i + 1}.
                      </span>
                      <input
                        type="text"
                        value={commitment.text}
                        onChange={(e) => {
                          const nextWeekCommitments = [
                            ...state.weeklyReflection.nextWeekCommitments,
                          ] as FormState["weeklyReflection"]["nextWeekCommitments"];
                          nextWeekCommitments[i] = {
                            ...nextWeekCommitments[i],
                            text: e.target.value,
                          };
                          updateReflection({ nextWeekCommitments });
                        }}
                        onBlur={flushSave}
                        placeholder={
                          i === 0
                            ? "Apply to 5 jobs"
                            : i === 1
                              ? "Gym 4 times"
                              : i === 2
                                ? "No weed"
                                : "Commitment"
                        }
                        className={inputClass}
                      />
                    </li>
                  ),
                )}
              </ol>
            </section>
          </form>
        ) : (
          <p className="mt-5 text-sm text-ink-faint">
            Complete Part 1, discuss with your mentor, then expand Part 2.
          </p>
        )}

        <div className="mt-8 flex flex-col gap-2 border-t border-line-subtle pt-6">
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={isSubmitting || isSaving}
            className="inline-flex items-center justify-center rounded-xl border border-ink/10 bg-ink px-6 py-3 text-sm font-medium tracking-wide text-paper transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Saving…" : "Save Weekly Review"}
          </button>

          {saveNotice && (
            <p className="text-sm text-ink-soft" aria-live="polite">
              {saveNotice.message}
              <span className="mt-1 block text-xs text-ink-faint">
                {formatSavedTimestamp(saveNotice.savedAt)}
              </span>
            </p>
          )}

          {(isSaving || saveError) && !isSubmitting && (
            <p
              className={[
                "text-xs tracking-wide",
                saveError ? "text-red-700" : "text-stone-400",
              ].join(" ")}
              aria-live="polite"
            >
              {saveError
                ? "Could not save. Check your database connection."
                : "Draft saved…"}
            </p>
          )}
        </div>
      </WorkspaceZone>
    </div>
  );
}

function ModeLabel({ mode, title }: { mode: string; title: string }) {
  return (
    <div>
      <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-ink-faint">
        {mode}
      </p>
      <p className="mt-1 font-serif text-xl tracking-tight text-ink sm:text-2xl">
        {title}
      </p>
    </div>
  );
}

function WeeklyScoreSummary({
  weekDate,
  score,
  max,
  principles,
}: {
  weekDate: string;
  score: number;
  max: number;
  principles: FormState["principles"];
}) {
  const hasAnyRating = principles.some((p) => p.status !== null);
  if (!hasAnyRating) return null;

  return (
    <section className="rounded-lg border border-line-subtle bg-white px-4 py-4 sm:px-5 sm:py-4">
      <p className="text-xs uppercase tracking-[0.2em] text-ink-faint">
        Weekly Score Summary
      </p>
      <p className="mt-1 text-sm text-ink-soft">
        {weekDate} ·{" "}
        <span className="font-medium text-ink">
          {formatWeeklyScore(score)} / {max}
        </span>
      </p>
      <ul className="mt-3 flex flex-col gap-1 font-mono text-[12px] leading-relaxed text-ink-soft">
        {PRINCIPLES.map((meta) => {
          const p = principles.find((x) => x.key === meta.key);
          const label = statusLabel(p?.status ?? null);
          return (
            <li key={meta.key} className="flex items-baseline gap-2">
              <span className="shrink-0">{meta.trajectoryLabel}</span>
              <span
                className="mb-1 min-w-[1rem] flex-1 border-b border-dotted border-stone-300"
                aria-hidden
              />
              <span className="shrink-0 text-ink">{label}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function Field({
  label,
  hint,
  required,
  warning,
  className = "",
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  warning?: boolean;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <label className={["flex flex-col gap-1.5", className].join(" ")}>
      {(label || required || warning) && (
        <span className="flex items-baseline gap-2">
          {label ? (
            <span className="text-sm font-medium text-ink-soft">{label}</span>
          ) : null}
          {warning ? (
            <span className="text-xs text-amber-700">Required</span>
          ) : required ? (
            <span className="text-xs text-ink-faint">Required</span>
          ) : null}
        </span>
      )}
      {hint && (
        <span className="text-xs leading-relaxed text-ink-faint">{hint}</span>
      )}
      {children}
    </label>
  );
}

const textareaClass = [
  "w-full resize-y rounded-lg border border-line-subtle bg-stone-50/70 px-3.5 py-2.5",
  "font-serif text-[15px] leading-relaxed text-ink-soft",
  "placeholder:text-ink-faint",
  "transition-colors focus:border-stone-300 focus:bg-white focus:outline-none",
  "disabled:cursor-not-allowed",
].join(" ");

const inputClass = [
  "w-full rounded-lg border border-line-subtle bg-stone-50/70 px-3.5 py-2.5",
  "font-serif text-[15px] text-ink-soft",
  "placeholder:text-ink-faint",
  "transition-colors focus:border-stone-300 focus:bg-white focus:outline-none",
  "disabled:cursor-not-allowed",
].join(" ");
