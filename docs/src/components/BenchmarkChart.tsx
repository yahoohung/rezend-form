import { useMemo, useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell
} from "recharts";

interface ChartDatum {
  id: string;
  label: string;
  value: number;
  variant: "baseline" | "best";
}

interface Scenario {
  id: string;
  label: string;
  description: string;
  data: ChartDatum[];
}

const scenarios: Scenario[] = [
  {
    id: "scenario-1",
    label: "High-frequency writes",
    description: "200 fields × 10 bursts × 200 writes — surfaces fan-out cost under server patch storms.",
    data: [
      { id: "rezend", label: "rezend-form", value: 34877, variant: "baseline" },
      { id: "rzf", label: "react-zustand-form", value: 1431, variant: "baseline" },
      { id: "rhf", label: "react-hook-form", value: 21, variant: "baseline" },
      { id: "formik", label: "formik", value: 39, variant: "baseline" }
    ]
  },
  {
    id: "scenario-2",
    label: "Typing + validation",
    description: "50 keystrokes with field-level validation — mirrors instant feedback while a user types.",
    data: [
      { id: "rezend", label: "rezend-form", value: 325736, variant: "baseline" },
      { id: "rzf", label: "react-zustand-form", value: 4138, variant: "baseline" },
      { id: "rhf", label: "react-hook-form", value: 791, variant: "baseline" },
      { id: "formik", label: "formik", value: 443, variant: "baseline" }
    ]
  },
  {
    id: "scenario-3",
    label: "Full validation",
    description: "Validate 200 fields at once — isolates pure validator throughput and diffing overhead.",
    data: [
      { id: "rezend", label: "rezend-form", value: 122697, variant: "baseline" },
      { id: "rzf", label: "react-zustand-form", value: 114592, variant: "baseline" },
      { id: "rhf", label: "react-hook-form", value: 25291, variant: "baseline" },
      { id: "formik", label: "formik", value: 43920, variant: "baseline" }
    ]
  }
];

const numberFormatter = new Intl.NumberFormat("en-US");

const variantFill: Record<ChartDatum["variant"], string> = {
  baseline: "url(#baselineGradient)",
  best: "url(#bestGradient)"
};

const variantGlow: Record<ChartDatum["variant"], string> = {
  baseline: "drop-shadow(0 8px 24px rgba(52, 211, 153, 0.3))",
  best: "drop-shadow(0 8px 24px rgba(34, 211, 238, 0.35))"
};

export function BenchmarkChart() {
  const [activeScenarioId, setActiveScenarioId] = useState<string>(scenarios[0]!.id);

  const activeScenario = useMemo(() => scenarios.find((s) => s.id === activeScenarioId) ?? scenarios[0]!, [activeScenarioId]);

  const chartData = useMemo(() => activeScenario.data, [activeScenario]);

  return (
    <div className="glass-panel overflow-hidden">
      <div className="relative px-6 py-6 lg:px-8">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.12),transparent_60%),radial-gradient(circle_at_bottom,_rgba(52,211,153,0.12),transparent_65%)] opacity-90" />
        <div className="relative flex flex-col gap-6 xl:flex-row xl:items-start xl:gap-12">
          <div className="space-y-4 xl:w-2/3">
            <div className="flex flex-wrap items-center gap-2">
              {scenarios.map((scenario) => {
                const isActive = scenario.id === activeScenario.id;
                return (
                  <button
                    key={scenario.id}
                    type="button"
                    onClick={() => setActiveScenarioId(scenario.id)}
                    className={`rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] transition ${
                      isActive
                        ? "border-white/20 bg-gradient-to-r from-emerald-400/80 to-sky-400/80 text-surface shadow-lg shadow-emerald-400/30"
                        : "border-white/10 bg-white/5 text-foreground/60 hover:text-foreground"
                    }`}
                  >
                    {scenario.label}
                  </button>
                );
              })}
            </div>
            <p className="text-sm text-foreground/60">{activeScenario.description}</p>
            <div className="h-[280px] w-full rounded-[24px] border border-white/5 bg-surface/80 px-2 pr-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical" margin={{ top: 24, left: 60, right: 24, bottom: 16 }}>
                  <defs>
                    <linearGradient id="baselineGradient" x1="0" x2="1" y1="0" y2="0">
                      <stop offset="0%" stopColor="rgba(52, 211, 153, 0.85)" />
                      <stop offset="100%" stopColor="rgba(16, 185, 129, 0.95)" />
                    </linearGradient>
                    <linearGradient id="bestGradient" x1="0" x2="1" y1="0" y2="0">
                      <stop offset="0%" stopColor="rgba(34, 211, 238, 0.85)" />
                      <stop offset="100%" stopColor="rgba(59, 130, 246, 0.9)" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid horizontal={false} stroke="rgba(255,255,255,0.06)" strokeDasharray="3 6" />
                  <XAxis type="number" tickLine={false} axisLine={false} tickFormatter={(value) => numberFormatter.format(value as number)} tick={{ fill: "rgba(248, 250, 252, 0.55)", fontSize: 12 }} />
                  <YAxis type="category" dataKey="label" axisLine={false} tickLine={false} width={160} tick={{ fill: "rgba(248, 250, 252, 0.65)", fontSize: 12 }} />
                  <Tooltip
                    cursor={{ fill: "rgba(15, 23, 42, 0.12)" }}
                    contentStyle={{
                      background: "rgba(15, 23, 42, 0.85)",
                      borderRadius: "16px",
                      border: "1px solid rgba(255,255,255,0.08)",
                      boxShadow: "0 18px 40px rgba(15,23,42,0.45)",
                      padding: "12px 16px",
                      color: "#F8FAFC"
                    }}
                    formatter={(value: number, _name, payload) => {
                      const datum = payload.payload as ChartDatum;
                      return [`${numberFormatter.format(value)} ops/sec`, datum.variant === "best" ? "best practice" : "baseline"];
                    }}
                  />
                  <Bar dataKey="value" barSize={22} radius={[12, 12, 12, 12]}>
                    {chartData.map((entry) => (
                      <Cell key={entry.id} fill={variantFill[entry.variant]} style={{ filter: variantGlow[entry.variant] }} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.3em] text-foreground/50">
              <span className="flex items-center gap-2">
                <span className="h-2 w-6 rounded-full bg-gradient-to-r from-emerald-400 via-emerald-300 to-emerald-500" />
                Baseline
              </span>
              <span className="flex items-center gap-2">
                <span className="h-2 w-6 rounded-full bg-gradient-to-r from-sky-400 via-sky-300 to-blue-500" />
                Best-practice
              </span>
            </div>
          </div>
          <div className="space-y-4 xl:w-1/3">
            <div className="glass-panel space-y-3 px-4 py-4 text-sm text-foreground/75">
              <p className="text-xs uppercase tracking-[0.3em] text-foreground/50">Snapshot</p>
              <p>Top performer → {chartData[0] ? `${chartData[0]!.label} (${numberFormatter.format(chartData[0]!.value)} ops/sec)` : "--"}</p>
              <p>
                Rezend Form vs next best →
                {chartData[0]
                  ? ` ${numberFormatter.format(chartData[0]!.value)} vs ${numberFormatter.format(chartData[1]?.value ?? 0)}`
                  : " --"}
              </p>
              <p className="text-xs text-foreground/45">Runs on Node v22.19.0 · React 18.3 · May 2025 snapshot.</p>
            </div>
            <div className="glass-panel space-y-2 px-4 py-4 text-xs text-foreground/60">
              <p className="uppercase tracking-[0.3em] text-foreground/45">Notes</p>
              <p>Baseline = naive integration with default batching.</p>
              <p>Best-practice = tuned variant from the same benchmark file.</p>
              <p>Rezend Form best-practice currently mirrors the baseline run; the slot is earmarked for future middleware presets.</p>
              <p className="text-foreground/45">Source: tests/perf/compare-plus.bench.tsx</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
