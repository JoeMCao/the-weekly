import type { ReactNode } from "react";

export function SectionHeader({
  eyebrow,
  subtitle,
}: {
  eyebrow: string;
  subtitle?: string;
}) {
  return (
    <div>
      <p className="text-xs uppercase tracking-[0.2em] text-ink-faint">
        {eyebrow}
      </p>
      {subtitle ? (
        <p className="mt-2 max-w-xl font-serif text-base italic leading-relaxed text-ink-soft">
          {subtitle}
        </p>
      ) : null}
    </div>
  );
}

export function WorkspaceZone({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={["space-y-4", className].join(" ")}>
      {children}
    </section>
  );
}
