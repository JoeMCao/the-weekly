"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import {
  getPrincipleGuide,
  type PrincipleGuide,
} from "@/lib/principle-guides";
import type { PrincipleKey } from "@/lib/principles";

export function PrincipleGuideButton({
  principleKey,
  title,
}: {
  principleKey: PrincipleKey;
  title: string;
}) {
  const guide = getPrincipleGuide(principleKey);
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  const close = useCallback(() => {
    setOpen(false);
    // Restore focus after close without scrolling the page.
    requestAnimationFrame(() => {
      buttonRef.current?.focus({ preventScroll: true });
    });
  }, []);

  useEffect(() => {
    if (!open) return;

    const dialog = dialogRef.current;
    const focusable = dialog?.querySelector<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    focusable?.focus({ preventScroll: true });

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        close();
        return;
      }

      if (event.key !== "Tab" || !dialog) return;

      const nodes = Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((el) => !el.hasAttribute("disabled"));

      if (nodes.length === 0) return;

      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, close]);

  if (!guide) return null;

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={`Learn more about ${title}`}
        aria-expanded={open}
        aria-haspopup="dialog"
        className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-line-subtle text-xs font-medium text-ink-faint transition-colors hover:border-stone-300 hover:text-ink-soft focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-300"
      >
        ?
      </button>

      {open && (
        <PrincipleGuideDialog
          guide={guide}
          titleId={titleId}
          descriptionId={descriptionId}
          dialogRef={dialogRef}
          onClose={close}
        />
      )}
    </>
  );
}

function PrincipleGuideDialog({
  guide,
  titleId,
  descriptionId,
  dialogRef,
  onClose,
}: {
  guide: PrincipleGuide;
  titleId: string;
  descriptionId: string;
  dialogRef: RefObject<HTMLDivElement>;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6">
      <button
        type="button"
        aria-label="Close principle guide"
        className="absolute inset-0 bg-ink/25"
        onClick={onClose}
      />

      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="relative z-10 flex max-h-[85vh] w-full max-w-lg flex-col rounded-t-2xl border border-line-subtle bg-white shadow-soft sm:rounded-2xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-line-subtle px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.2em] text-ink-faint">
              Principle Guide
            </p>
            <h3
              id={titleId}
              className="mt-1 font-serif text-xl tracking-tight text-ink"
            >
              {guide.fullTitle}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg border border-line-subtle px-3 py-1.5 text-xs uppercase tracking-[0.12em] text-ink-soft transition-colors hover:border-stone-300 hover:text-ink"
          >
            Close
          </button>
        </div>

        <div
          id={descriptionId}
          className="overflow-y-auto px-5 py-5 sm:px-6 sm:py-6"
        >
          <GuideBlock label="What it means">
            <p>{guide.shortDefinition}</p>
          </GuideBlock>

          <GuideBlock label="Why it matters">
            <p>{guide.personalMeaning}</p>
          </GuideBlock>

          <GuideBlock label="Failure mode">
            <p>{guide.failureMode}</p>
          </GuideBlock>

          <GuideBlock label="What counts as evidence">
            <ul className="list-disc space-y-1.5 pl-5">
              {guide.evidenceExamples.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </GuideBlock>

          <GuideBlock label="Questions to get unstuck">
            <ul className="list-disc space-y-1.5 pl-5">
              {guide.reflectionPrompts.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </GuideBlock>

          <GuideBlock label="Remember" last>
            <p className="font-serif italic leading-relaxed text-ink-soft">
              {guide.anchor}
            </p>
          </GuideBlock>
        </div>
      </div>
    </div>
  );
}

function GuideBlock({
  label,
  children,
  last = false,
}: {
  label: string;
  children: ReactNode;
  last?: boolean;
}) {
  return (
    <div className={last ? "" : "mb-5"}>
      <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-ink-soft">
        {label}
      </p>
      <div className="mt-2 text-sm leading-relaxed text-ink-soft">{children}</div>
    </div>
  );
}
