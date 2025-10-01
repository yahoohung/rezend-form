import { ReactNode } from "react";

interface Metric {
  label: string;
  value: string;
}

interface HeroProps {
  metrics: Metric[];
  children?: ReactNode;
}

export function Hero({ metrics, children }: HeroProps) {
  return (
    <section className="hero-grid relative isolate overflow-hidden pb-24 pt-28">
      <div className="pointer-events-none absolute inset-0 opacity-40">
        <div className="absolute -left-32 top-12 h-80 w-80 rounded-full bg-emerald-400/30 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-72 w-72 rounded-full bg-sky-400/20 blur-3xl" />
      </div>
      <div className="relative mx-auto flex max-w-6xl flex-col gap-10 px-6 md:flex-row md:items-end md:justify-between">
        <div className="max-w-2xl space-y-8">
          <div className="glass-panel inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs uppercase tracking-[0.4em] text-foreground/70">
            <span>Rezend Form</span>
            <span className="h-1 w-1 rounded-full bg-foreground/60" />
            <span>User-first state</span>
          </div>
          <div className="space-y-6">
            <h1 className="text-4xl font-semibold leading-tight text-foreground sm:text-5xl md:text-6xl">
              High-signal form state for ambitious teams.
            </h1>
            <p className="text-lg text-foreground/70 md:text-xl">
              Start simple with a single input, then scale to thousands of fields without losing reactivity.
              Rezend Form keeps your UI calm, even when data streams in from servers, sockets, or AI copilots.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <a
              href="#quickstart"
              className="rounded-full bg-gradient-to-r from-emerald-400 via-teal-300 to-sky-400 px-6 py-3 text-base font-semibold text-surface shadow-lg shadow-emerald-400/20 transition hover:shadow-emerald-300/40"
            >
              Explore the quick start
            </a>
            <a
              href="https://stackblitz.com/~/github/rezend/rezend-form"
              className="rounded-full border border-white/10 px-6 py-3 text-base font-semibold text-foreground/70 transition hover:text-foreground"
            >
              Try in StackBlitz
            </a>
          </div>
        </div>
        <div className="glass-panel relative flex-shrink-0 space-y-6 px-8 py-8 md:w-80">
          <div>
            <h2 className="text-sm uppercase tracking-[0.3em] text-foreground/60">Metrics</h2>
            <p className="mt-2 text-2xl font-semibold text-foreground">Stay calm at scale</p>
          </div>
          <dl className="grid grid-cols-1 gap-4">
            {metrics.map((metric) => (
              <div key={metric.label} className="rounded-2xl bg-black/20 p-4">
                <dt className="text-xs uppercase tracking-[0.3em] text-foreground/60">{metric.label}</dt>
                <dd className="mt-2 text-2xl font-semibold text-foreground">{metric.value}</dd>
              </div>
            ))}
          </dl>
          {children}
        </div>
      </div>
    </section>
  );
}
