import { Bench } from "tinybench";
import { JSDOM } from "jsdom";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import React from "react";
import { useRezendForm } from "../../src";

type HookResult = ReturnType<typeof useRezendForm>;

type Harness = {
  renderWith: (id: string) => HookResult;
  destroy: () => void;
};

function ensureDomEnvironment() {
  if (typeof window !== "undefined" && typeof document !== "undefined") {
    return;
  }

  const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>");
  const { window } = dom;

  globalThis.window = window as unknown as typeof globalThis & Window;
  globalThis.document = window.document;
  globalThis.navigator = {
    userAgent: "tinybench"
  } as Navigator;
  globalThis.HTMLElement = window.HTMLElement;
  globalThis.HTMLDivElement = window.HTMLDivElement;
  globalThis.customElements = window.customElements;
  globalThis.requestAnimationFrame =
    (window.requestAnimationFrame?.bind(window) as typeof globalThis.requestAnimationFrame) ??
    ((cb: FrameRequestCallback) => setTimeout(cb, 0));
  globalThis.cancelAnimationFrame =
    (window.cancelAnimationFrame?.bind(window) as typeof globalThis.cancelAnimationFrame) ??
    ((id: number) => clearTimeout(id));
}

function createHarness(): Harness {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  let currentValue: HookResult | undefined;

  function HarnessComponent({ id }: { id: string }) {
    currentValue = useRezendForm({ id });
    return null;
  }

  function renderWith(id: string) {
    act(() => {
      root.render(
        <React.StrictMode>
          <HarnessComponent id={id} />
        </React.StrictMode>
      );
    });

    if (!currentValue) {
      throw new Error("Expected Rezend form value to be defined after render");
    }

    return currentValue;
  }

  function destroy() {
    act(() => {
      root.unmount();
    });
    container.remove();
  }

  return { renderWith, destroy };
}

type TaskResultRow = {
  Task: string;
  "ops/sec": string;
  "margin%": string;
  Samples: number;
};

ensureDomEnvironment();
(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

const bench = new Bench({
  time: 300,
  iterations: 0
});

bench
  .add("useRezendForm retains memoized helpers when id is stable", () => {
    const harness = createHarness();
    const first = harness.renderWith("checkout");
    const second = harness.renderWith("checkout");
    if (first !== second) {
      throw new Error("Expected the hook to memoize helpers for a stable id");
    }
    harness.destroy();
  })
  .add("useRezendForm rematerializes helpers when id changes", () => {
    const harness = createHarness();
    const first = harness.renderWith("checkout");
    const second = harness.renderWith("success");
    if (first === second) {
      throw new Error("Expected a new helpers object after the form id changed");
    }
    harness.destroy();
  });

await bench.warmup();
await bench.run();

const results: TaskResultRow[] = bench.tasks.map((task) => {
  const result = task.result;
  if (!result) {
    return {
      Task: task.name,
      "ops/sec": "n/a",
      "margin%": "n/a",
      Samples: 0
    };
  }

  return {
    Task: task.name,
    "ops/sec": result.hz.toFixed(0),
    "margin%": (result.rme ?? 0).toFixed(2),
    Samples: result.samples.length
  };
});

console.table(results);
