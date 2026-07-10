"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { saveDailyNote } from "@/app/actions";
import type { DailyNoteData } from "@/lib/daily-notes";
import type { DateKey } from "@/lib/date";
import { formatDayNoteLabel } from "@/lib/week";

const AUTOSAVE_DELAY_MS = 1000;
const NOTE_PLACEHOLDER =
  "Free write. What happened? What are you noticing? What state are you in?";

type SaveStatus = "idle" | "typing" | "saving" | "saved" | "error";

function defaultExpandedDay(
  notes: DailyNoteData[],
  today: DateKey,
  isCurrentWeek: boolean,
): DateKey | null {
  const daySet = new Set(notes.map((n) => n.noteDate));

  if (isCurrentWeek && daySet.has(today)) {
    return today;
  }

  for (let i = notes.length - 1; i >= 0; i--) {
    if (notes[i].content.trim()) {
      return notes[i].noteDate;
    }
  }

  return null;
}

function NoteSaveStatus({
  status,
  onRetry,
}: {
  status: SaveStatus;
  onRetry: () => void;
}) {
  return (
    <div
      className="flex h-4 items-center justify-end text-xs"
      aria-live="polite"
      aria-atomic="true"
    >
      {status === "typing" && (
        <span className="text-stone-400">Typing…</span>
      )}
      {status === "saving" && (
        <span className="text-stone-400">Saving…</span>
      )}
      {status === "saved" && (
        <span className="text-stone-400">✓ Saved</span>
      )}
      {status === "error" && (
        <span className="text-red-700">
          Unable to save —{" "}
          <button
            type="button"
            onClick={onRetry}
            className="underline decoration-red-700/40 underline-offset-2 hover:decoration-red-700"
          >
            Retry
          </button>
        </span>
      )}
      {status === "idle" && (
        <span className="invisible select-none" aria-hidden>
          ✓ Saved
        </span>
      )}
    </div>
  );
}

export function DailyNotesSection({
  weekStart,
  notes: initialNotes,
  today,
  isCurrentWeek,
}: {
  weekStart: DateKey;
  notes: DailyNoteData[];
  today: DateKey;
  isCurrentWeek: boolean;
}) {
  const [notes, setNotes] = useState(initialNotes);
  const [expandedDay, setExpandedDay] = useState<DateKey | null>(() =>
    defaultExpandedDay(initialNotes, today, isCurrentWeek),
  );
  const [saveStatus, setSaveStatus] = useState<Record<DateKey, SaveStatus>>({});

  const notesRef = useRef(notes);
  const timersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const lastSavedRef = useRef<Record<string, string>>(
    Object.fromEntries(initialNotes.map((n) => [n.noteDate, n.content])),
  );
  const dirtyRef = useRef<Set<DateKey>>(new Set());

  notesRef.current = notes;

  const getStatus = useCallback(
    (noteDate: DateKey): SaveStatus => saveStatus[noteDate] ?? "idle",
    [saveStatus],
  );

  const setStatus = useCallback((noteDate: DateKey, status: SaveStatus) => {
    setSaveStatus((prev) => ({ ...prev, [noteDate]: status }));
  }, []);

  const hasUnsavedChanges = useCallback(() => {
    if (dirtyRef.current.size > 0) return true;
    if (Object.keys(timersRef.current).length > 0) return true;
    return notesRef.current.some(
      (n) => lastSavedRef.current[n.noteDate] !== n.content,
    );
  }, []);

  useEffect(() => {
    setNotes(initialNotes);
    setExpandedDay(defaultExpandedDay(initialNotes, today, isCurrentWeek));
    lastSavedRef.current = Object.fromEntries(
      initialNotes.map((n) => [n.noteDate, n.content]),
    );
    setSaveStatus({});
    dirtyRef.current = new Set();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- hydrate on week change
  }, [weekStart]);

  const markDirty = useCallback((noteDate: DateKey) => {
    dirtyRef.current.add(noteDate);
  }, []);

  const markClean = useCallback((noteDate: DateKey) => {
    dirtyRef.current.delete(noteDate);
  }, []);

  const clearTimer = useCallback((noteDate: DateKey) => {
    if (timersRef.current[noteDate]) {
      clearTimeout(timersRef.current[noteDate]);
      delete timersRef.current[noteDate];
    }
  }, []);

  const persist = useCallback(
    async (noteDate: DateKey, content: string) => {
      setStatus(noteDate, "saving");
      try {
        const result = await saveDailyNote(weekStart, noteDate, content);
        if (!result.ok) throw new Error(result.error);
        lastSavedRef.current[noteDate] = content;
        markClean(noteDate);
        setStatus(noteDate, "saved");
      } catch {
        setStatus(noteDate, "error");
      }
    },
    [weekStart, markClean, setStatus],
  );

  const scheduleSave = useCallback(
    (noteDate: DateKey, content: string) => {
      clearTimer(noteDate);
      timersRef.current[noteDate] = setTimeout(() => {
        delete timersRef.current[noteDate];
        if (lastSavedRef.current[noteDate] !== content) {
          void persist(noteDate, content);
        } else {
          markClean(noteDate);
          setStatus(noteDate, "saved");
        }
      }, AUTOSAVE_DELAY_MS);
    },
    [clearTimer, persist, markClean, setStatus],
  );

  const updateNote = useCallback(
    (noteDate: DateKey, content: string) => {
      setNotes((prev) =>
        prev.map((n) => (n.noteDate === noteDate ? { ...n, content } : n)),
      );

      if (content === lastSavedRef.current[noteDate]) {
        clearTimer(noteDate);
        markClean(noteDate);
        setStatus(noteDate, "saved");
        return;
      }

      markDirty(noteDate);
      setStatus(noteDate, "typing");
      scheduleSave(noteDate, content);
    },
    [clearTimer, markClean, markDirty, scheduleSave, setStatus],
  );

  const flushSave = useCallback(
    (noteDate: DateKey, content: string) => {
      clearTimer(noteDate);
      if (lastSavedRef.current[noteDate] !== content) {
        void persist(noteDate, content);
      } else {
        markClean(noteDate);
        setStatus(noteDate, "saved");
      }
    },
    [clearTimer, persist, markClean, setStatus],
  );

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!hasUnsavedChanges()) return;
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);

  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      for (const timer of Object.values(timers)) {
        clearTimeout(timer);
      }
      for (const note of notesRef.current) {
        if (lastSavedRef.current[note.noteDate] !== note.content) {
          void saveDailyNote(weekStart, note.noteDate, note.content);
        }
      }
    };
  }, [weekStart]);

  return (
    <div className="rounded-xl border border-line-subtle/80 bg-white/70 px-4 py-4 sm:px-5 sm:py-5">
      <ul className="flex flex-col gap-1.5">
        {notes.map((note) => {
          const isExpanded = expandedDay === note.noteDate;
          const status = getStatus(note.noteDate);
          const isToday = note.noteDate === today;

          return (
            <li
              key={note.noteDate}
              className="rounded-lg border border-transparent bg-stone-50/50"
            >
              <button
                type="button"
                onClick={() =>
                  setExpandedDay(isExpanded ? null : note.noteDate)
                }
                className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-stone-50"
                aria-expanded={isExpanded}
              >
                <span
                  className="w-3 shrink-0 font-serif text-sm text-ink-faint"
                  aria-hidden
                >
                  {isExpanded ? "⌄" : "›"}
                </span>
                <span className="font-serif text-[15px] text-ink-soft">
                  {formatDayNoteLabel(note.noteDate)}
                  {isToday && isCurrentWeek && (
                    <span className="ml-2 text-xs uppercase tracking-[0.12em] text-ink-faint">
                      Today
                    </span>
                  )}
                </span>
                {!isExpanded && note.content.trim() && (
                  <span className="ml-auto truncate text-xs text-ink-faint">
                    {note.content.trim().slice(0, 48)}
                    {note.content.trim().length > 48 ? "…" : ""}
                  </span>
                )}
              </button>

              {isExpanded && (
                <div className="border-t border-line-subtle/80 px-3 pb-3 pt-2.5">
                  <textarea
                    value={note.content}
                    onChange={(e) =>
                      updateNote(note.noteDate, e.target.value)
                    }
                    onBlur={(e) => flushSave(note.noteDate, e.target.value)}
                    rows={6}
                    placeholder={NOTE_PLACEHOLDER}
                    className={textareaClass}
                  />
                  <div className="mt-2">
                    <NoteSaveStatus
                      status={status}
                      onRetry={() => flushSave(note.noteDate, note.content)}
                    />
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

const textareaClass = [
  "w-full resize-y rounded-lg border border-line-subtle bg-white px-3.5 py-2.5",
  "font-serif text-[15px] leading-relaxed text-ink-soft",
  "placeholder:text-ink-faint",
  "transition-colors focus:border-stone-300 focus:outline-none",
].join(" ");
