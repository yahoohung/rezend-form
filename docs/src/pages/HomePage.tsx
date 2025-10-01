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
    description: "Bring the zero-dependency store into your project."
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
    description: "Register your first field – controlled and ready to go."
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
    description: "Selectors stay narrow, so only the right components re-render."
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
    description: "Move from store logic to a live form component with markTouched + validate hooks."
  }
];

const principles = [
  {
    title: "Stream-friendly",
    description:
      "Keep user intent first even when server patches arrive every few milliseconds. Dirty fields stay untouched until the user is ready.",
    bullets: [
      "Server mutations go through middleware and diff buses",
      "`markDirty` + `setControlledValue` never fight each other",
      "Built-in safeguards against prototype pollution"
    ]
  },
  {
    title: "Composable safety",
    description:
      "Middleware wraps every mutation, so audit logging, access control, and batching live in one predictable lane.",
    bullets: [
      "`MutCtx` exposes type, path, payload, epoch, timestamp",
      "Compose unlimited middlewares with near-zero overhead",
      "Plugins can add validators or lifecycle hooks on the fly"
    ]
  },
  {
    title: "Progressive complexity",
    description:
      "Start with one field, scale out to dense data tables. The store keeps selectors and watchers stable at every step.",
    bullets: [
      "Subscription dependencies auto-track per selector",
      "Watchers fan out with microtask batching",
      "Async validation stays cancellable via epochs"
    ]
  }
];

const advancedScenarios = [
  {
    stage: "1",
    title: "Async validation & fallbacks",
    description:
      "Wrap resolvers in middleware to time-box validations and deliver instant optimistic UI while results settle."
  },
  {
    stage: "2",
    title: "Live collaboration",
    description:
      "Pipe socket events through a plugin that only patches untouched fields. Users keep typing; the backend keeps streaming."
  },
  {
    stage: "3",
    title: "Observability layer",
    description:
      "Emit structured diff events into your analytics lake. Every mutation carries the same MutCtx metadata for replay."
  }
];

export function HomePage() {
  return (
    <div className="min-h-screen bg-surface text-foreground">
      <TopNav />
      <Hero metrics={metrics}>
        <p className="text-sm text-foreground/70">
          Deploy on Vercel in seconds. Vite-powered docs deliver instant hot reload, while the store stays framework agnostic.
        </p>
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
          id="quickstart"
          eyebrow="Quick start"
          title="From zero to a reacting form in three steps"
          subtitle="Follow the morning-coffee path: install, register, subscribe. Each snippet is production-safe and mirrors the real API surface."
          action={
            <a
              href="https://stackblitz.com/~/github/rezend/rezend-form"
              className="rounded-full border border-white/10 px-4 py-2 text-sm font-medium text-foreground/70 transition hover:text-foreground"
            >
              Open template →
            </a>
          }
        >
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
          <div className="mt-10">
            <GradientCard
              title="Keep server patches clean"
              description="Reset initialValue before applying backend updates so dirty state only reflects user intent."
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
          subtitle="Every write funnels through the same MutCtx signature, so policies like audits, batching, or guards sit in one place."
        >
          <div className="glass-panel space-y-6 p-8">
            <div className="space-y-4">
              <p className="text-sm text-foreground/70">
                A middleware receives a <code className="rounded-md bg-black/40 px-2 py-1 text-xs">MutCtx</code> ({"type"}, path, payload, epoch, now). Compose them to log, reject, or transform mutations before they touch the store.
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
          id="advanced"
          eyebrow="Advanced"
          title="From solo builder to mission control"
          subtitle="Layer use cases progressively. Each stage builds on top of the same primitives, so your mental model never resets."
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
          <div className="space-y-6">
            <div className="glass-panel space-y-4 px-6 py-6 lg:px-8">
              <p className="text-sm text-foreground/70">
                The <code className="rounded-md bg-black/40 px-2 py-1 text-xs">compare-plus</code> harness boots JSDOM, mounts each library’s React integration, and drives it through scripted workloads. Tinybench reports operations per second (higher is better); every run uses Node v22.19.0 and the stock repo config (May 2025 snapshot).
              </p>
              <p className="text-sm text-foreground/65">
                Each scenario isolates a real production pressure point: server bursts, per-keystroke feedback, or whole-form validation. Baseline variants represent the simplest drop-in usage, while best-practice variants apply the library’s recommended batching or reset patterns.
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
