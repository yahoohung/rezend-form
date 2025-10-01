import type { PropsWithChildren, ReactNode } from "react";

interface SectionProps extends PropsWithChildren {
  id: string;
  eyebrow?: string;
  title: string;
  subtitle?: string;
  action?: ReactNode;
}

export function Section({ id, eyebrow, title, subtitle, action, children }: SectionProps) {
  return (
    <section id={id} className="mx-auto mt-24 max-w-6xl px-6">
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          {eyebrow && <p className="text-sm uppercase tracking-[0.3em] text-foreground/60">{eyebrow}</p>}
          <h2 className="section-heading">{title}</h2>
          {subtitle && <p className="section-subtitle">{subtitle}</p>}
        </div>
        {action && <div className="flex-shrink-0">{action}</div>}
      </div>
      <div className="mt-12 space-y-8 md:space-y-10">{children}</div>
    </section>
  );
}
