import type { ReactNode } from "react";

/**
 * Shared page chrome: eyebrow, title, optional dek, optional meta.
 */
export function ViewPageHeader({
  eyebrow,
  title,
  dek,
  meta,
  metaClassName,
}: {
  eyebrow: string;
  title: ReactNode;
  dek?: ReactNode;
  meta?: ReactNode;
  /** e.g. hide meta on small screens: "hidden sm:block" */
  metaClassName?: string;
}) {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between sm:gap-8">
      <div className="min-w-0 flex-1">
        <p className="text-xs uppercase tracking-[0.2em] text-ink-faint">
          {eyebrow}
        </p>
        <h1 className="mt-1 font-serif text-3xl tracking-tight text-ink sm:text-4xl">
          {title}
        </h1>
        {dek ? (
          <div className="mt-3 max-w-xl font-serif text-base italic leading-relaxed text-ink-soft">
            {dek}
          </div>
        ) : null}
      </div>
      {meta ? (
        <div
          className={[
            "shrink-0 sm:text-right",
            metaClassName ?? "",
          ].join(" ")}
        >
          {meta}
        </div>
      ) : null}
    </header>
  );
}

/** Top border + padding before legend / secondary actions. */
export const viewFooterChrome = "border-t border-line-subtle pt-8";

/** Swatch row (Month / Year / Memento legends). */
export const viewLegendSwatches =
  "flex flex-wrap items-center gap-x-6 gap-y-2 text-[11px] uppercase tracking-[0.18em] text-ink-faint";
