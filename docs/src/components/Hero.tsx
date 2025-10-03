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
              Build calm, fast forms even when data keeps changing.
            </h1>
            <p className="text-lg text-foreground/70 md:text-xl">
              Rezend Form keeps inputs responsive while servers, automations, or teammates update the same records in real time.
            </p>
            <ul className="space-y-2 text-sm text-foreground/70">
              <li>
                <span className="font-semibold text-foreground">Solo builders</span> plug in the store and publish a working form in minutes.
              </li>
              <li>
                <span className="font-semibold text-foreground">Product teams</span> keep components steady when dozens of updates arrive each second.
              </li>
              <li>
                <span className="font-semibold text-foreground">IT leads</span> get clear change history and simple hooks for business rules.
              </li>
            </ul>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <a
              href="#quickstart"
              className="rounded-full bg-gradient-to-r from-emerald-400 via-teal-300 to-sky-400 px-6 py-3 text-base font-semibold text-surface shadow-lg shadow-emerald-400/20 transition hover:shadow-emerald-300/40"
            >
              Start building now
            </a>
            <a
              href="#enterprise"
              className="rounded-full border border-white/15 px-6 py-3 text-base font-semibold text-foreground/70 transition hover:border-white/30 hover:text-foreground"
            >
              Review enterprise safeguards
            </a>
            <a
              href="https://stackblitz.com/~/github/rezend/rezend-form"
              className="rounded-full border border-white/10 px-6 py-3 text-base font-semibold text-foreground/70 transition hover:border-white/25 hover:text-foreground"
            >
              Launch StackBlitz demo
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
