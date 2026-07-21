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
  previousCommitmentStatusLabel,
  PREVIOUS_COMMITMENT_STATUSES,
  type PreviousCommitmentStatus,
} from "@/lib/commitments";
import { DailyNotesSection } from "@/components/DailyNotesSection";
import { SectionHeader, WorkspaceZone } from "@/components/SectionHeader";
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
import type { WeeklyReviewSummary } from "@/lib/reviews";
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
  const [saveNotice, setSaveNotice] = useState<{
    message: string;
    savedAt: string;
  } | null>(() =>
    review.reviewMetadata.savedAt
      ? {
          message: isComplete
            ? "Review Completed"
            : "Weekly Review Saved",
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
    setSaveNotice(
      review.reviewMetadata.savedAt
        ? {
            message: isComplete
              ? "Review Completed"
              : "Weekly Review Saved",
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
      if (result.savedAt) {
        setSaveNotice({
          message: result.message,
          savedAt: result.savedAt,
        });
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

  const handleCopyWeeklyCompass = useCallback(async () => {
    setIsCopying(true);
    setCopyError(false);
    setCopyNotice(null);
    try {
      const text = formatWeeklyCompassForClipboard(
        stateRef.current,
        dailyNotesRef.current,
      );
      await navigator.clipboard.writeText(text);
      setCopyNotice("Weekly Compass copied");
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
          eyebrow="This Week's Commitments"
          subtitle="The commitments you chose during last week's review."
        />
        <div className="rounded-xl border border-stone-300/80 bg-white px-5 py-6 shadow-soft sm:px-7 sm:py-7">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
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
            <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-900">
              These commitments are from an older review. Use{" "}
              <span className="font-medium">Refresh from previous review</span>{" "}
              to pull from your latest completed week.
            </p>
          )}

          {state.previousCommitments.length > 0 ? (
            <ul className="mt-6 flex flex-col gap-4">
              {state.previousCommitments.map((item, index) => (
                <li
                  key={item.id}
                  className="flex flex-col gap-2 border-b border-line-subtle/80 pb-4 last:border-b-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between sm:gap-6"
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
                          "rounded-lg border px-3 py-1.5 text-xs uppercase tracking-[0.12em]",
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
        </div>
      </WorkspaceZone>

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

      <WorkspaceZone className="border-t border-line-subtle pt-16 sm:pt-20">
        <SectionHeader
          eyebrow="Weekly Review"
          subtitle="Reflect on the week, identify patterns, and set the next commitments."
        />

        <form
          className="mt-8 flex flex-col gap-8 sm:gap-10"
          onSubmit={(e) => e.preventDefault()}
        >
      <section className="rounded-xl border border-line-subtle bg-white px-4 py-5 shadow-soft sm:px-6 sm:py-6">
        <p className="text-xs uppercase tracking-[0.2em] text-ink-faint">
          Review Metadata
        </p>
        <div className="mt-5 flex flex-col gap-5">
          <Field label="Review Date">
            <input
              type="date"
              value={state.reviewMetadata.reviewDate || defaultReviewDate}
              onChange={(e) => updateMetadata({ reviewDate: e.target.value })}
              onBlur={flushSave}
              className={inputClass}
            />
          </Field>
          <Field
            label="Context"
            hint="Anything unusual about this review?"
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

      {commitmentScore.total > 0 && (
        <section className="rounded-xl border border-line-subtle bg-white px-4 py-5 shadow-soft sm:px-6 sm:py-5">
          <p className="text-xs uppercase tracking-[0.2em] text-ink-faint">
            Last Week&apos;s Commitments
          </p>
          {sourceRange && (
            <p className="mt-1 text-xs text-ink-faint">From {sourceRange}</p>
          )}
          <p className="mt-4 text-sm text-ink-soft">
            Commitment Score:{" "}
            <span className="font-medium text-ink">
              {formatCommitmentScore(
                commitmentScore.score,
                commitmentScore.total,
              )}{" "}
              completed
            </span>
          </p>
          {state.previousCommitments.length > 0 && (
            <ul className="mt-4 flex flex-col gap-2 border-t border-line-subtle pt-4">
              {state.previousCommitments.map((item) => (
                <li
                  key={item.id}
                  className="flex items-baseline justify-between gap-4 text-sm"
                >
                  <span className="font-serif text-ink-soft">{item.text}</span>
                  <span className="shrink-0 text-xs uppercase tracking-[0.12em] text-ink-faint">
                    {previousCommitmentStatusLabel(item.status)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <WeeklyScoreSummary
        weekDate={formatWeekRange(review.weekStart)}
        score={score}
        max={max}
        principles={state.principles}
      />

      <ul className="flex flex-col gap-5">
        {PRINCIPLES.map((meta) => {
          const p = state.principles.find((x) => x.key === meta.key)!;
          const needsReflection = p.status !== null && !p.reflection.trim();
          const locked = p.status === null;

          return (
            <li
              key={meta.key}
              className="rounded-xl border border-line-subtle bg-white px-4 py-5 shadow-soft sm:px-6 sm:py-6"
            >
              <h2 className="font-serif text-xl tracking-tight text-ink sm:text-2xl">
                {meta.title}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-ink-faint">
                {meta.summary}
              </p>

              <div className="mt-5">
                <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-ink-soft">
                  Failure mode
                </p>
                <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                  {meta.failureMode}
                </p>
              </div>

              <div className="mt-5">
                <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-ink-soft">
                  Rating
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
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
                        "rounded-lg border px-4 py-2 text-xs uppercase tracking-[0.14em] transition-colors",
                        p.status === status
                          ? "border-stone-400 bg-stone-100 text-ink"
                          : "border-line-subtle text-ink-faint hover:border-stone-300 hover:text-ink-soft",
                      ].join(" ")}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>

              <div
                className={[
                  "mt-6 flex flex-col gap-5",
                  locked ? "pointer-events-none opacity-45" : "",
                ].join(" ")}
                aria-disabled={locked}
              >
                {locked && (
                  <p className="pointer-events-none text-xs text-ink-faint">
                    Choose Yes, Somewhat, or No before reflecting.
                  </p>
                )}

                <div>
                  <p className="text-sm font-medium text-ink-soft">Question</p>
                  <p className="mt-2 font-serif text-lg leading-snug text-ink">
                    {meta.question}
                  </p>
                </div>

                <Field
                  label="Reflection"
                  warning={needsReflection}
                >
                  <textarea
                    value={p.reflection}
                    onChange={(e) =>
                      updatePrinciple(meta.key, { reflection: e.target.value })
                    }
                    onBlur={flushSave}
                    rows={3}
                    placeholder="What happened this week?"
                    className={textareaClass}
                    aria-required={p.status !== null}
                    disabled={locked}
                    tabIndex={locked ? -1 : 0}
                  />
                </Field>

                <Field
                  label="Evidence"
                  hint="What specific evidence supports your answer?"
                >
                  <textarea
                    value={p.evidence}
                    onChange={(e) =>
                      updatePrinciple(meta.key, { evidence: e.target.value })
                    }
                    onBlur={flushSave}
                    rows={3}
                    placeholder="Name the concrete moments, actions, or outcomes."
                    className={textareaClass}
                    disabled={locked}
                    tabIndex={locked ? -1 : 0}
                  />
                </Field>
              </div>
            </li>
          );
        })}
      </ul>

      <section className="rounded-xl border border-line-subtle bg-white px-4 py-5 shadow-soft sm:px-6 sm:py-6">
        <p className="text-xs uppercase tracking-[0.2em] text-ink-faint">
          Close the Week
        </p>

        <div className="mt-6 flex flex-col gap-5">
          <Field
            label="Week Summary"
            hint="What was this week really about?"
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

          <Field label="Wins" hint="What am I proud of?">
            <textarea
              value={state.weeklyReflection.wins}
              onChange={(e) => updateReflection({ wins: e.target.value })}
              onBlur={flushSave}
              rows={3}
              className={textareaClass}
            />
          </Field>

          <Field
            label="Attention Required"
            hint="What needs attention next week?"
          >
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
            label="Recurring Pattern"
            hint="What pattern showed up again this week?"
          >
            <textarea
              value={state.weeklyReflection.recurringPattern}
              onChange={(e) =>
                updateReflection({ recurringPattern: e.target.value })
              }
              onBlur={flushSave}
              rows={3}
              placeholder="Avoidance, drift, isolation, comfort seeking…"
              className={textareaClass}
            />
          </Field>

          <Field
            label="Theme"
            hint="What was the central lesson or theme of this week?"
          >
            <textarea
              value={state.weeklyReflection.theme}
              onChange={(e) => updateReflection({ theme: e.target.value })}
              onBlur={flushSave}
              rows={2}
              placeholder="Action reduces anxiety. Consistency beats intensity."
              className={textareaClass}
            />
          </Field>
        </div>
      </section>

      <section className="rounded-xl border border-line-subtle bg-white px-4 py-5 shadow-soft sm:px-6 sm:py-6">
        <p className="text-xs uppercase tracking-[0.2em] text-ink-faint">
          Next Week Commitments
        </p>
        <p className="mt-2 text-sm text-ink-soft">
          What would make next week a win?
        </p>
        <p className="mt-1 text-xs text-ink-faint">
          Short, actionable, measurable.
        </p>
        <ol className="mt-5 flex flex-col gap-3">
          {state.weeklyReflection.nextWeekCommitments.map((commitment, i) => (
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
          ))}
        </ol>
      </section>

      <div className="flex flex-col gap-3 border-t border-line-subtle pt-8">
        <button
          type="button"
          onClick={() => void handleSubmit()}
          disabled={isSubmitting || isSaving}
          className="inline-flex items-center justify-center rounded-xl border border-ink/10 bg-ink px-6 py-3 text-sm font-medium tracking-wide text-paper transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "Saving…" : "Save Weekly Review"}
        </button>

        <button
          type="button"
          onClick={() => void handleCopyWeeklyCompass()}
          disabled={isCopying}
          className="inline-flex items-center justify-center rounded-xl border border-line-subtle bg-white px-6 py-3 text-sm font-medium tracking-wide text-ink-soft transition-colors hover:border-stone-300 hover:text-ink disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isCopying ? "Copying…" : "Copy Weekly Compass"}
        </button>

        {copyNotice && (
          <p className="text-sm text-ink-soft" aria-live="polite">
            {copyNotice}
          </p>
        )}

        {copyError && (
          <p className="text-xs tracking-wide text-red-700" aria-live="polite">
            Could not copy. Check clipboard permissions and try again.
          </p>
        )}

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
        </form>
      </WorkspaceZone>
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
  return (
    <section className="rounded-xl border border-line-subtle bg-white px-4 py-5 shadow-soft sm:px-6 sm:py-6">
      <p className="text-xs uppercase tracking-[0.2em] text-ink-faint">
        Weekly Score Summary
      </p>
      <p className="mt-1 font-serif text-lg text-ink">{weekDate}</p>
      <p className="mt-4 text-sm text-ink-soft">
        Weekly Score:{" "}
        <span className="font-medium text-ink">
          {formatWeeklyScore(score)} / {max}
        </span>
      </p>
      <ul className="mt-5 flex flex-col gap-1.5 font-mono text-[13px] leading-relaxed text-ink-soft">
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
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  warning?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="flex items-baseline gap-2">
        <span className="text-sm font-medium text-ink-soft">{label}</span>
        {warning ? (
          <span className="text-xs text-amber-700">Required</span>
        ) : required ? (
          <span className="text-xs text-ink-faint">Required</span>
        ) : null}
      </span>
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
