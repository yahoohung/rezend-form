import { TopNav } from "../components/TopNav";
import { Hero } from "../components/Hero";
import { Section } from "../components/Section";
import { GradientCard } from "../components/GradientCard";
import { CodeBlock } from "../components/CodeBlock";
import { LiveFormDemo } from "../components/LiveFormDemo";
import { BenchmarkChart } from "../components/BenchmarkChart";

const metrics = [
  { label: "Cold start", value: "< 1ms" },
  { label: "Re-render fanout", value: "Predictable" },
  { label: "Subscribers", value: "1 → 10k" }
];

const quickStartSteps = [
  {
    title: "Install the core",
    variants: [
      {
        id: "pnpm",
        label: "pnpm",
        language: "bash" as const,
        code: "pnpm add @form/core"
      },
      {
        id: "npm",
        label: "npm",
        language: "bash" as const,
        code: "npm install @form/core"
      },
      {
        id: "yarn",
        label: "yarn",
        language: "bash" as const,
        code: "yarn add @form/core"
      }
    ],
    description: "Install the lightweight core package."
  },
  {
    title: "Create a store",
    variants: [
      {
        id: "ts",
        label: "TS",
        language: "tsx" as const,
        code: `import { createFormStore, type ValidationResult } from "@form/core";

interface ProfileForm {
  profile: {
    name: string;
  };
}

const form = createFormStore();

const nameValidator = (value: unknown): ValidationResult => {
  if (typeof value === "string" && value.trim().length >= 2) {
    return { ok: true };
  }
  return { ok: false, message: "Name is too short" };
};

form.register("profile.name", {
  mode: "controlled",
  initialValue: "Ada" satisfies ProfileForm["profile"]["name"],
  validate: nameValidator
});`
      },
      {
        id: "js",
        label: "JS",
        language: "javascript" as const,
        code: `import { createFormStore } from "@form/core";

const form = createFormStore();
form.register("profile.name", {
  mode: "controlled",
  initialValue: "Ada"
});`
      }
    ],
    description: "Register your first field with an initial value."
  },
  {
    title: "Subscribe & react",
    variants: [
      {
        id: "ts",
        label: "TS",
        language: "tsx" as const,
        code: `type ProfileName = string;

const unsubscribe = form.subscribe<ProfileName>(
  (snapshot) => snapshot.getValue("profile.name") as ProfileName,
  (name) => {
    const uppercase: ProfileName = name.toUpperCase();
    console.log("Name updated", uppercase);
  }
);

// later -> unsubscribe();`
      },
      {
        id: "js",
        label: "JS",
        language: "javascript" as const,
        code: `form.subscribe(
  (snapshot) => snapshot.getValue("profile.name"),
  (name) => console.log("Name updated", name)
);`
      }
    ],
    description: "Listen for changes and respond without re-rendering everything."
  },
  {
    title: "Bind to your UI",
    variants: [
      {
        id: "ts",
        label: "TS",
        language: "tsx" as const,
        code: `import { useEffect, useState } from "react";
import { createFormStore } from "@form/core";

const form = createFormStore();

form.register("profile.name", {
  mode: "controlled",
  initialValue: "Ada"
});

export function ProfileForm() {
  const [name, setName] = useState(() =>
    (form.getValue("profile.name") as string) ?? ""
  );

  useEffect(() => {
    const unsubscribe = form.subscribe(
      (snapshot) => snapshot.getValue("profile.name") as string,
      setName
    );
    return unsubscribe;
  }, []);

  return (
    <form className="flex flex-col gap-3">
      <label className="text-sm text-slate-400">Name</label>
      <input
        value={name}
        onChange={(event) =>
          form.setControlledValue("profile.name", event.target.value)
        }
        onFocus={() => form.markTouched("profile.name")}
        onBlur={() => form.validate("profile.name")}
      />
    </form>
  );
}`
      },
      {
        id: "js",
        label: "JS",
        language: "jsx" as const,
        code: `import { useEffect, useState } from "react";
import { createFormStore } from "@form/core";

const form = createFormStore();

form.register("profile.name", {
  mode: "controlled",
  initialValue: "Ada"
});

export function ProfileForm() {
  const [name, setName] = useState(() =>
    form.getValue("profile.name") || ""
  );

  useEffect(() => {
    const unsubscribe = form.subscribe(
      (snapshot) => snapshot.getValue("profile.name"),
      (value) => setName(value || "")
    );
    return unsubscribe;
  }, []);

  return (
    <form className="flex flex-col gap-3">
      <label className="text-sm text-slate-400">Name</label>
      <input
        value={name}
        onChange={(event) =>
          form.setControlledValue("profile.name", event.target.value)
        }
        onFocus={() => form.markTouched("profile.name")}
        onBlur={() => form.validate("profile.name")}
      />
    </form>
  );
}`
      }
    ],
    description: "Move from store logic to a live form component with built-in helpers for touched state and validation."
  }
];

const personaTracks = [
  {
    title: "Solo builders & feature squads",
    description: "Ship polished forms without wiring extra state tools.",
    bullets: [
      "Add Rezend Form to any React or vanilla project in one import.",
      "Reuse the quick start snippets directly in production code.",
      "Open the StackBlitz demo to check the behaviour with live data."
    ]
  },
  {
    title: "Product teams at scaleups",
    description: "Keep forms fast even when traffic is heavy.",
    bullets: [
      "Watch only the fields a screen needs so big updates do not freeze the UI.",
      "Add simple rules to run validation, optimistic updates, or sync logic in one place.",
      "Use the bundled benchmarks to see performance before you ship."
    ]
  },
  {
    title: "Platform & enterprise IT",
    description: "Empower product squads while keeping policy, audit, and risk under control.",
    bullets: [
      "Change logs include who changed what, which field, and when.",
      "Add policy checks, logging, or validation modules without touching feature code.",
      "Deploy on your own stack or Vercel without extra runtime services."
    ]
  }
];

const principles = [
  {
    title: "Stream-friendly",
    description:
      "Keep user intent first even when server patches arrive every few milliseconds. Dirty fields stay untouched until the user is ready.",
    bullets: [
      "Server updates pass through reviewable handlers before they touch the UI",
      "Dirty tracking never collides with incoming value updates",
      "Built-in protections stop unsafe object paths"
    ]
  },
  {
    title: "Composable safety",
    description:
      "Middleware wraps every mutation, so audit logging, access control, and batching live in one predictable lane.",
    bullets: [
      "Each mutation context spells out the type, field path, payload, epoch, and timestamp",
      "Chain as many custom rules as you need without slowing down",
      "Add new checks or lifecycle hooks with small plugins"
    ]
  },
  {
    title: "Progressive complexity",
    description:
      "Start with one field, scale out to dense data tables. The store keeps selectors and watchers stable at every step.",
    bullets: [
      "Listeners automatically follow only the fields they care about",
      "Updates batch together so large grids stay smooth",
      "Background validation stops itself when newer input arrives"
    ]
  }
];

const enterpriseSignals = [
  {
    title: "Audit-ready event stream",
    description:
      "Every change emits structured data you can forward to your logging or analytics tools right away.",
    bullets: [
      "Every change event includes who, what field, the new data, and the time.",
      "Starter templates show how to mask, enrich, or block writes before they land.",
      "Send those events to your existing data pipeline with only a few lines of code."
    ]
  },
  {
    title: "Operational guardrails",
    description:
      "Design for streaming workloads without sacrificing user intent or compliance.",
    bullets: [
      "Touched flags keep focused inputs safe from background updates.",
      "Collaboration helpers only patch untouched fields, so teammates do not overwrite each other.",
      "Baseline replay restores a form instantly without losing the change log."
    ]
  },
  {
    title: "Partner-level support",
    description:
      "Roadmap transparency and expert help for regulated teams and mission-critical flows.",
    bullets: [
      "Private onboarding sessions for architecture reviews and performance tuning.",
      "Long-term support channel with coordinated releases and breakage alerts.",
      "Regular security updates covering dependencies, patch timing, and SOC 2 progress."
    ]
  }
];

const advancedScenarios = [
  {
    stage: "1",
    title: "Experiment faster",
    description:
      "Try new validation or fallback flows with simple switches you can enable or disable safely."
  },
  {
    stage: "2",
    title: "Scale collaboration",
    description:
      "Let live updates flow in while keeping the active user's cursor safe from conflicts."
  },
  {
    stage: "3",
    title: "Mission control",
    description:
      "Stream change logs to your monitoring tools, rebuild a form on demand, and answer audit questions quickly."
  }
];

const benchmarkTakeaways = [
  {
    title: "Storm-ready writes",
    description: "About 24× faster when the server sends rapid-fire updates (34,877 vs 1,431 ops/sec).",
    bullets: [
      "Large batches of field updates stay smooth.",
      "Ideal for shared data grids and dashboards that refresh often."
    ]
  },
  {
    title: "Instant validation",
    description: "About 79× faster feedback while a user types (325,736 vs 4,138 ops/sec).",
    bullets: [
      "Each keystroke can run checks without slowing typing.",
      "Leaves room for helper bots or policy checks on every change."
    ]
  },
  {
    title: "Parity on full checks",
    description: "Still faster on full-form validation (122,697 ops/sec).",
    bullets: [
      "Bulk reviews do not introduce slowdowns.",
      "Best-practice and default runs match, so the fast path is the default path."
    ]
  }
];

export function HomePage() {
  return (
    <div className="min-h-screen bg-surface text-foreground">
      <TopNav />
      <Hero metrics={metrics}>
        <div className="space-y-2 text-sm text-foreground/65">
          <p>Framework agnostic · MIT licensed · Zero runtime dependencies</p>
          <p className="flex flex-wrap items-center gap-1">
            <span>Need a deeper review?</span>
            <a href="#enterprise" className="text-accent hover:text-accent/80">
              Jump to the enterprise checklist
            </a>
            <span>.</span>
          </p>
        </div>
      </Hero>

      <main className="pb-32">
        <Section
          id="overview"
          eyebrow="Overview"
          title="Why another form store?"
          subtitle="Rezend Form puts UX first. Inputs feel native, server patches stay respectful, and developers keep a single mental model from prototype to production."
        >
          <div className="grid gap-6 md:grid-cols-3">
            {principles.map((principle) => (
              <GradientCard key={principle.title} title={principle.title} description={principle.description}>
                <ul className="space-y-2 text-sm text-foreground/75">
                  {principle.bullets.map((bullet) => (
                    <li key={bullet} className="flex items-start gap-2">
                      <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-accent" />
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              </GradientCard>
            ))}
          </div>
        </Section>

        <Section
          id="teams"
          eyebrow="Teams"
          title="Built to welcome every builder"
          subtitle="Pick the guidance that matches your day job and ship with confidence."
        >
          <div className="grid gap-6 md:grid-cols-3">
            {personaTracks.map((persona) => (
              <GradientCard key={persona.title} title={persona.title} description={persona.description}>
                <ul className="space-y-2 text-sm text-foreground/75">
                  {persona.bullets.map((bullet) => (
                    <li key={bullet} className="flex items-start gap-2">
                      <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-accent" />
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              </GradientCard>
            ))}
          </div>
        </Section>

        <Section
          id="quickstart"
          eyebrow="Quick start"
          title="From install to realtime UX in four moves"
          subtitle="Choose the lane that matches your build cycle. Every snippet is production-safe and mirrors the real API surface."
          action={
            <a
              href="https://stackblitz.com/~/github/rezend/rezend-form"
              className="rounded-full border border-white/10 px-4 py-2 text-sm font-medium text-foreground/70 transition hover:text-foreground"
            >
              Open template →
            </a>
          }
        >
          <p className="text-sm text-foreground/65">
            Start with the plain JS version, layer in TypeScript for typed validators, then subscribe only to the fields your UI cares about.
          </p>
          <div className="grid gap-6 lg:grid-cols-2 xl:gap-8">
            {quickStartSteps.map((step, index) => (
              <GradientCard
                key={step.title}
                title={`Step ${index + 1}. ${step.title}`}
                description={step.description}
                className={
                  index === quickStartSteps.length - 1
                    ? "lg:col-span-2"
                    : index === 2
                    ? "lg:col-span-2"
                    : undefined
                }
              >
                <CodeBlock variants={step.variants} />
              </GradientCard>
            ))}
          </div>
          <div className="mt-10">
            <LiveFormDemo />
          </div>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <a
              href="/examples"
              className="rounded-full border border-white/10 px-4 py-2 text-sm font-medium text-foreground/70 transition hover:border-white/25 hover:text-foreground"
            >
              Browse integration recipes
            </a>
            <a
              href="/performance"
              className="rounded-full border border-white/10 px-4 py-2 text-sm font-medium text-foreground/70 transition hover:border-white/25 hover:text-foreground"
            >
              Open the performance playground
            </a>
          </div>
          <div className="mt-10">
            <GradientCard
              title="Keep server patches clean"
              description="Reset the saved baseline before applying server updates so the form only flags true user edits."
            >
              <CodeBlock
                variants={[
                  {
                    id: "ts",
                    label: "TS",
                    language: "tsx",
                    code: `import { createFormStore, type FormStore, type Middleware } from "@form/core";

let form!: FormStore;
let isServerPatch = false;

const serverBaseline: Middleware = (next) => (ctx) => {
  if (ctx.type === "setControlledValue" && ctx.path && isServerPatch) {
    form.register(ctx.path, {
      mode: "controlled",
      initialValue: ctx.payload
    });
  }
  next(ctx);
};

form = createFormStore({ middleware: [serverBaseline] });

export function applyServerPatch(path: string, value: unknown) {
  isServerPatch = true;
  try {
    form.setControlledValue(path, value);
  } finally {
    isServerPatch = false;
  }
}

applyServerPatch("profile.name", "Grace Hopper");`
                  },
                  {
                    id: "js",
                    label: "JS",
                    language: "javascript",
                    code: `import { createFormStore } from "@form/core";

let form;
let isServerPatch = false;

const serverBaseline = (next) => (ctx) => {
  if (ctx.type === "setControlledValue" && ctx.path && isServerPatch) {
    form.register(ctx.path, {
      mode: "controlled",
      initialValue: ctx.payload
    });
  }
  next(ctx);
};

form = createFormStore({ middleware: [serverBaseline] });

export function applyServerPatch(path, value) {
  isServerPatch = true;
  try {
    form.setControlledValue(path, value);
  } finally {
    isServerPatch = false;
  }
}

applyServerPatch("profile.name", "Grace Hopper");`
                  }
                ]}
              />
            </GradientCard>
          </div>
        </Section>

        <Section
          id="core"
          eyebrow="Core ideas"
          title="Middleware keeps every mutation observable"
          subtitle="Every write funnels through the same mutation context (MutCtx), so audits, batching, and guards live in one predictable lane."
        >
          <div className="glass-panel space-y-6 p-8">
            <div className="space-y-4">
              <p className="text-sm text-foreground/70">
                Middleware always receives a <code className="rounded-md bg-black/40 px-2 py-1 text-xs">MutCtx</code> — short for mutation context. It is a plain object with the mutation type, field path, payload, epoch, and timestamp, so you can inspect or change activity before it hits the store.
              </p>
              <CodeBlock
                code={`import type { Middleware } from "@form/core";

const auditMiddleware: Middleware = (next) => (ctx) => {
  if (ctx.type === "setControlledValue") {
    console.info("[mut]", ctx.path, ctx.payload);
  }
  next(ctx);
};

createFormStore({ middleware: [auditMiddleware] });`}
              />
            </div>
            <div className="space-y-4">
              <p className="text-sm text-foreground/70">
                Inject middleware later through <code className="rounded-md bg-black/40 px-2 py-1 text-xs">ctx.addMiddleware</code> when plugins load. Middleware is lightweight, so you can chain many without losing throughput.
              </p>
              <CodeBlock
                code={`const batching: Middleware = (next) => {
  let queue: MutCtx[] = [];
  let scheduled = false;

  return (ctx) => {
    queue.push(ctx);
    if (!scheduled) {
      scheduled = true;
      queueMicrotask(() => {
        queue.forEach(next);
        queue = [];
        scheduled = false;
      });
    }
  };
};

store = createFormStore({ middleware: [batching] });`}
              />
            </div>
          </div>
        </Section>

        <Section
          id="plugins"
          eyebrow="Plugin surface"
          title="Plugins extend the store without touching components"
          subtitle="Setup once, receive a PluginContext, return cleanup. Perfect for schema validators, backend sync, or devtool bridges."
        >
          <div className="glass-panel space-y-6 p-8">
            <div className="space-y-4">
              <p className="text-sm text-foreground/70">
                A plugin runs on store creation. Use the context to listen to lifecycle events, add middleware, or register validators. When the store dies, your cleanup runs.
              </p>
              <CodeBlock
                code={`import type { Plugin } from "@form/core";

export const backendSync: Plugin = {
  name: "backend-sync",
  setup(ctx) {
    const unsubscribe = ctx.on("commit", (event) => () => {
      console.debug("diff", event);
    });

    ctx.addMiddleware((next) => (mut) => {
      if (mut.type === "setControlledValue" && mut.path?.startsWith("profile.")) {
        queueMicrotask(() => pushPatch(mut));
      }
      next(mut);
    });

    return () => unsubscribe();
  }
};

const store = createFormStore({ plugins: [backendSync] });`}
              />
            </div>
            <div className="space-y-4">
              <p className="text-sm text-foreground/70">
                Compose multiple plugins for schema adapters, observability, or feature flags. Each gets its own teardown; failures propagate cleanly so the store stays predictable.
              </p>
              <CodeBlock
                code={`const schema = createSchemaPlugin(zodResolver);
const devtools = createDevtoolsPlugin();

const store = createFormStore({
  plugins: [schema, devtools]
});`}
              />
            </div>
          </div>
        </Section>

        <Section
          id="enterprise"
          eyebrow="Enterprise"
          title="Enterprise safeguards without the ceremony"
          subtitle="Bring Rezend Form through security review with built-in audit data, policy hooks, and a support partnership."
          action={
            <a
              href="mailto:hello@rezend.dev?subject=Rezend%20Form%20Enterprise%20Review"
              className="rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-foreground/80 transition hover:bg-white/20"
            >
              Book a walkthrough →
            </a>
          }
        >
          <div className="grid gap-6 md:grid-cols-3">
            {enterpriseSignals.map((signal) => (
              <GradientCard key={signal.title} title={signal.title} description={signal.description}>
                <ul className="space-y-2 text-sm text-foreground/75">
                  {signal.bullets.map((bullet) => (
                    <li key={bullet} className="flex items-start gap-2">
                      <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-accent" />
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              </GradientCard>
            ))}
          </div>
        </Section>

        <Section
          id="advanced"
          eyebrow="Advanced"
          title="From solo builder to mission control"
          subtitle="Layer capabilities progressively. The same primitives carry you from first launch to mission control."
        >
          <div className="grid gap-6 md:grid-cols-3">
            {advancedScenarios.map((scenario) => (
              <GradientCard
                key={scenario.title}
                title={`Stage ${scenario.stage}`}
                description={scenario.title}
                accent="linear-gradient(160deg, rgba(236, 72, 153, 0.4), rgba(14, 165, 233, 0.2))"
              >
                <p className="text-sm text-foreground/70">{scenario.description}</p>
              </GradientCard>
            ))}
          </div>
          <div className="glass-panel p-8">
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
              <div>
                <h3 className="text-2xl font-semibold text-foreground">Next up: interactive playground</h3>
                <p className="mt-2 max-w-2xl text-sm text-foreground/70">
                  Our roadmap includes live sandboxes, benchmark visualizers, and schema adapters. Contributions are welcome – check out the GitHub issues or open a discussion.
                </p>
              </div>
              <a
                href="https://github.com/rezend/rezend-form/issues"
                className="rounded-full bg-white/10 px-6 py-3 text-sm font-semibold text-foreground/80 transition hover:bg-white/20"
              >
                View roadmap
              </a>
            </div>
          </div>
        </Section>

        <Section
          id="benchmarks"
          eyebrow="Benchmarks"
          title="Compare Rezend Form with other libraries"
          subtitle="See how Rezend Form stacks up against React Hook Form, Formik, Final Form, and React Zustand Form under identical workloads."
        >
          <div className="grid gap-6 md:grid-cols-3">
            {benchmarkTakeaways.map((takeaway) => (
              <GradientCard key={takeaway.title} title={takeaway.title} description={takeaway.description}>
                <ul className="space-y-2 text-sm text-foreground/75">
                  {takeaway.bullets.map((bullet) => (
                    <li key={bullet} className="flex items-start gap-2">
                      <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-accent" />
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              </GradientCard>
            ))}
          </div>
          <div className="mt-10 space-y-6">
            <div className="glass-panel space-y-4 px-6 py-6 lg:px-8">
              <p className="text-sm text-foreground/70">
                The <code className="rounded-md bg-black/40 px-2 py-1 text-xs">compare-plus</code> script spins up a shared JSDOM environment, renders each library, and runs the same scripted workload. Tinybench reports operations per second (higher is better). Every run uses Node v22.19.0 and the stock repo config from May 2025.
              </p>
              <p className="text-sm text-foreground/65">
                Each scenario focuses on a common stress test: bursty server updates, per-keystroke validation, or full-form checks. “Baseline” means the default setup. “Best practice” applies each library’s own recommended tuning.
              </p>
              <CodeBlock
                variants={[
                  {
                    id: "pnpm",
                    label: "pnpm",
                    language: "bash",
                    code: "pnpm bench:compare-plus"
                  },
                  {
                    id: "npm",
                    label: "npm",
                    language: "bash",
                    code: "npm run bench:compare-plus"
                  }
                ]}
              />
              <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-3">
                <GradientCard
                  title="Workloads"
                  description="Three focused drills reveal where each store pays its costs."
                >
                  <ul className="space-y-2 text-sm text-foreground/75">
                    <li>
                      <span className="block font-medium text-foreground">High-frequency writes</span>
                      <span className="text-foreground/65">200 fields × 10 bursts × 200 writes. Stresses cache invalidation and fan-out when servers stream patches.</span>
                    </li>
                    <li>
                      <span className="block font-medium text-foreground">Typing + validation</span>
                      <span className="text-foreground/65">50 keystrokes on a single field with validation on every change. Highlights scheduler overhead and validation churn.</span>
                    </li>
                    <li>
                      <span className="block font-medium text-foreground">Full form validation</span>
                      <span className="text-foreground/65">Validate all 200 fields at once to surface pure validator throughput and error diffing.</span>
                    </li>
                  </ul>
                </GradientCard>
                <GradientCard
                  title="Library matrix"
                  description="Baseline vs best-practice runs show the gap between naive usage and tuned integrations."
                >
                  <ul className="space-y-2 text-sm text-foreground/75">
                    <li>Rezend Form — baseline and best-practice are identical today; the store already micro-batches writes.</li>
                    <li>React Hook Form — default `setValue` / `reset` + `shouldUnregister` tuning</li>
                    <li>Formik — naïve `setFieldValue` / `setValues` batched pattern</li>
                    <li>Final Form — default runLoop / explicit `batch` API</li>
                    <li>React Zustand Form — stock store / memoized selector setup</li>
                  </ul>
                </GradientCard>
                <GradientCard
                  title="How to read it"
                  description="Translate the ops/sec gap back to product work."
                >
                  <ul className="space-y-2 text-sm text-foreground/75">
                    <li>Ops/sec = completed workload iterations per second. Double the score ≈ half the time under the same load.</li>
                    <li>Big spreads in scenario 1 imply selector churn or state cloning costs when patching many fields.</li>
                    <li>Scenario 2 mirrors instant validation experiences; watch for libraries that stall typing feedback.</li>
                    <li>Scenario 3 is the cost of pressing “Submit” on dense forms; higher means faster error hydration.</li>
                  </ul>
                </GradientCard>
              </div>
            </div>
            <BenchmarkChart />
            <p className="text-xs text-foreground/50">
              Source: <code className="rounded-md bg-black/40 px-2 py-1">tests/perf/compare-plus.bench.tsx</code>. Adjust metrics or add new harnesses there; the CLI command auto-picks up your changes.
            </p>
          </div>
        </Section>
      </main>
      <footer className="border-t border-white/10 bg-surface/60 py-10 text-center text-sm text-foreground/60">
        <p>© {new Date().getFullYear()} Rezend Form</p>
      </footer>
    </div>
  );
}
