"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { saveWeeklyReview } from "@/app/actions";
import {
  FAULTS,
  PRINCIPLES,
  type FaultKey,
  type PrincipleKey,
  type PrincipleStatus,
} from "@/lib/principles";
import type { WeeklyReviewData } from "@/lib/reviews";

const AUTOSAVE_DELAY_MS = 1200;

type FormState = WeeklyReviewData;

function buildState(review: WeeklyReviewData): FormState {
  return structuredClone(review);
}

export function WeeklyReviewForm({
  review,
}: {
  review: WeeklyReviewData;
}) {
  const [state, setState] = useState<FormState>(() => buildState(review));
  const [saveError, setSaveError] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [, startTransition] = useTransition();
  const stateRef = useRef(state);
  const lastSavedRef = useRef(JSON.stringify(review));
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  stateRef.current = state;

  useEffect(() => {
    const next = buildState(review);
    setState(next);
    lastSavedRef.current = JSON.stringify(review);
    stateRef.current = next;
    setSaveError(false);
    setIsSaving(false);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- hydrate on week change only
  }, [review.weekStart]);

  const persist = useCallback(
    (next: FormState) => {
      setIsSaving(true);
      return saveWeeklyReview(next.weekStart, {
        alignmentScore: next.alignmentScore,
        alignmentReason: next.alignmentReason,
        principles: Object.fromEntries(
          next.principles.map((p) => [
            p.key,
            { reflection: p.reflection, status: p.status },
          ]),
        ) as Partial<
          Record<
            PrincipleKey,
            { reflection: string; status: PrincipleStatus | null }
          >
        >,
        faults: next.faults,
        provedMeWrong: next.provedMeWrong,
        avoiding: next.avoiding,
        commitments: next.commitments,
        nextWeekJose: next.nextWeekJose,
      })
        .then((result) => {
          if (!result.ok) throw new Error(result.error);
          lastSavedRef.current = JSON.stringify(next);
          setSaveError(false);
        })
        .catch(() => setSaveError(true))
        .finally(() => setIsSaving(false));
    },
    [],
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

  const update = useCallback(
    (patch: Partial<FormState>) => {
      setState((prev) => {
        const next = { ...prev, ...patch };
        stateRef.current = next;
        scheduleSave(next);
        return next;
      });
    },
    [scheduleSave],
  );

  const updatePrinciple = useCallback(
    (
      key: PrincipleKey,
      patch: { reflection?: string; status?: PrincipleStatus | null },
    ) => {
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

  const toggleFault = useCallback(
    (key: FaultKey) => {
      setState((prev) => {
        const selected = prev.faults.selected.includes(key)
          ? prev.faults.selected.filter((k) => k !== key)
          : [...prev.faults.selected, key];
        const next = {
          ...prev,
          faults: { ...prev.faults, selected },
        };
        stateRef.current = next;
        scheduleSave(next);
        return next;
      });
    },
    [scheduleSave],
  );

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

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      const current = JSON.stringify(stateRef.current);
      if (current !== lastSavedRef.current) {
        void persist(stateRef.current);
      }
    };
  }, [review.weekStart, persist]);

  const hasFaults = state.faults.selected.length > 0;

  return (
    <form
      className="flex flex-col gap-14 sm:gap-16"
      onSubmit={(e) => e.preventDefault()}
    >
      {/* Section 1 — North Star */}
      <section className="flex flex-col gap-5">
        <SectionLabel>North Star</SectionLabel>
        <h2 className="font-serif text-xl leading-snug text-ink sm:text-2xl">
          Am I becoming the person I want to become?
        </h2>
        <div className="flex flex-col gap-3">
          <input
            type="range"
            min={1}
            max={5}
            step={1}
            value={state.alignmentScore ?? 3}
            onChange={(e) =>
              update({ alignmentScore: Number(e.target.value) })
            }
            onPointerUp={flushSave}
            className="w-full accent-stone-700"
            aria-label="Alignment score"
          />
          <div className="flex justify-between text-xs text-ink-faint">
            <span>Not at all</span>
            <span className="font-medium text-ink-soft">
              {state.alignmentScore ?? "—"}
            </span>
            <span>Completely</span>
          </div>
        </div>
        <Field label="Why?">
          <textarea
            value={state.alignmentReason}
            onChange={(e) => update({ alignmentReason: e.target.value })}
            onBlur={flushSave}
            rows={3}
            placeholder="Be honest."
            className={textareaClass}
          />
        </Field>
      </section>

      {/* Section 2 — Principles */}
      <section className="flex flex-col gap-5">
        <SectionLabel>Principles</SectionLabel>
        <ul className="flex flex-col gap-4">
          {PRINCIPLES.map((meta) => {
            const p = state.principles.find((x) => x.key === meta.key)!;
            return (
              <li
                key={meta.key}
                className="rounded-xl border border-line-subtle bg-white px-4 py-4 shadow-soft sm:px-5 sm:py-5"
              >
                <p className="text-xs uppercase tracking-[0.18em] text-ink-faint">
                  {meta.title}
                </p>
                <p className="mt-2 font-serif text-lg text-ink">
                  {meta.question}
                </p>
                <div className="mt-4">
                  <textarea
                    value={p.reflection}
                    onChange={(e) =>
                      updatePrinciple(meta.key, { reflection: e.target.value })
                    }
                    onBlur={flushSave}
                    rows={2}
                    placeholder="Reflection"
                    className={textareaClass}
                  />
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
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
                        "rounded-lg border px-3 py-1.5 text-xs uppercase tracking-[0.14em] transition-colors",
                        p.status === status
                          ? "border-stone-400 bg-stone-100 text-ink"
                          : "border-line-subtle text-ink-faint hover:border-stone-300 hover:text-ink-soft",
                      ].join(" ")}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      {/* Section 3 — Fault Detection */}
      <section className="flex flex-col gap-5">
        <SectionLabel>Fault Detection</SectionLabel>
        <h2 className="font-serif text-xl leading-snug text-ink sm:text-2xl">
          Which patterns showed up this week?
        </h2>
        <ul className="flex flex-col gap-2">
          {FAULTS.map((fault) => {
            const checked = state.faults.selected.includes(fault.key);
            return (
              <li key={fault.key}>
                <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-line-subtle bg-white px-4 py-3 transition-colors hover:bg-stone-50/80">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleFault(fault.key)}
                    className="mt-0.5 h-4 w-4 rounded border-stone-300 accent-stone-700"
                  />
                  <span className="text-[15px] text-ink-soft">{fault.label}</span>
                </label>
              </li>
            );
          })}
        </ul>
        {hasFaults && (
          <Field label="Where did these show up?">
            <textarea
              value={state.faults.whereShowedUp}
              onChange={(e) =>
                update({
                  faults: {
                    ...state.faults,
                    whereShowedUp: e.target.value,
                  },
                })
              }
              onBlur={flushSave}
              rows={3}
              className={textareaClass}
            />
          </Field>
        )}
      </section>

      {/* Section 4 — Reality Calibration */}
      <section className="flex flex-col gap-5">
        <SectionLabel>Reality Calibration</SectionLabel>
        <Field label="What proved me wrong this week?">
          <textarea
            value={state.provedMeWrong}
            onChange={(e) => update({ provedMeWrong: e.target.value })}
            onBlur={flushSave}
            rows={3}
            className={textareaClass}
          />
        </Field>
        <Field label="What am I avoiding?">
          <textarea
            value={state.avoiding}
            onChange={(e) => update({ avoiding: e.target.value })}
            onBlur={flushSave}
            rows={3}
            className={textareaClass}
          />
        </Field>
      </section>

      {/* Section 5 — Next Week */}
      <section className="flex flex-col gap-5">
        <SectionLabel>Next Week</SectionLabel>
        <p className="text-sm text-ink-faint">Exactly three commitments. No more.</p>
        <ol className="flex flex-col gap-3">
          {state.commitments.map((value, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="mt-2.5 font-serif text-lg text-ink-faint">
                {i + 1}.
              </span>
              <input
                type="text"
                value={value}
                onChange={(e) => {
                  const commitments = [...state.commitments] as [
                    string,
                    string,
                    string,
                  ];
                  commitments[i] = e.target.value;
                  update({ commitments });
                }}
                onBlur={flushSave}
                placeholder={`Commitment ${i + 1}`}
                className={inputClass}
              />
            </li>
          ))}
        </ol>
      </section>

      {/* Section 6 — Identity Statement */}
      <section className="flex flex-col gap-5">
        <SectionLabel>Identity Statement</SectionLabel>
        <h2 className="font-serif text-xl leading-snug text-ink sm:text-2xl">
          Next week, the version of José I admire would…
        </h2>
        <input
          type="text"
          value={state.nextWeekJose}
          onChange={(e) => update({ nextWeekJose: e.target.value })}
          onBlur={flushSave}
          placeholder="One sentence."
          className={inputClass}
        />
      </section>

      {(isSaving || saveError) && (
        <p
          className={[
            "text-xs tracking-wide",
            saveError ? "text-red-700" : "text-stone-400",
          ].join(" ")}
          aria-live="polite"
        >
          {saveError ? "Could not save. Check your database connection." : "Saving…"}
        </p>
      )}
    </form>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs uppercase tracking-[0.2em] text-ink-faint">
      {children}
    </p>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="font-serif text-lg text-ink">{label}</span>
      {children}
    </label>
  );
}

const textareaClass = [
  "w-full resize-y rounded-lg border border-line-subtle bg-stone-50/70 px-3.5 py-2.5",
  "font-serif text-[15px] leading-relaxed text-ink-soft",
  "placeholder:text-ink-faint",
  "transition-colors focus:border-stone-300 focus:bg-white focus:outline-none",
].join(" ");

const inputClass = [
  "w-full rounded-lg border border-line-subtle bg-stone-50/70 px-3.5 py-2.5",
  "font-serif text-[15px] text-ink-soft",
  "placeholder:text-ink-faint",
  "transition-colors focus:border-stone-300 focus:bg-white focus:outline-none",
].join(" ");
