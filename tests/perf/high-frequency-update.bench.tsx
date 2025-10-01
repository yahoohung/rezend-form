/**
 * High-frequency batched update benchmark comparing Rezend Form with other popular form libraries.
 *
 * The benchmark runs entirely in Node using JSDOM so the React-based libraries can execute
 * without a browser. For each library we register 200 fields and perform repeated batches of
 * programmatic updates without validation to focus purely on write throughput.
 */

process.env.NODE_ENV = "test";

import { Bench } from "tinybench";
import { JSDOM } from "jsdom";
import React, { useEffect } from "react";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { useForm, UseFormReturn } from "react-hook-form";
import { useFormik, FormikProps } from "formik";
import { createForm } from "final-form";
import { createFormStore } from "@form/core";

interface Harness {
  run(): Promise<void> | void;
  teardown(): Promise<void> | void;
}

const FIELD_COUNT = 200;
const BATCH_COUNT = 10;
const UPDATES_PER_BATCH = 200;
const fieldNames = Array.from({ length: FIELD_COUNT }, (_, index) => `field${index}`);
const updateOrder = Array.from({ length: UPDATES_PER_BATCH }, (_, index) => index % FIELD_COUNT);
const defaultValues = fieldNames.reduce<Record<string, number>>((acc, name) => {
  acc[name] = 0;
  return acc;
}, {});

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

// Ensure React has a DOM to work with inside the benchmark environment.
const dom = new JSDOM("<!doctype html><html><body></body></html>");
const jsdomWindow = dom.window;

Object.defineProperty(globalThis, "window", {
  value: jsdomWindow,
  configurable: true
});

Object.defineProperty(globalThis, "document", {
  value: jsdomWindow.document,
  configurable: true
});

Object.defineProperty(globalThis, "navigator", {
  value: jsdomWindow.navigator,
  configurable: true
});

(globalThis as any).HTMLElement = jsdomWindow.HTMLElement;
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

function createRezHarness(): Harness {
  const store = createFormStore();
  fieldNames.forEach((name) => {
    store.register(name, { mode: "controlled", initialValue: 0 });
  });

  let cycle = 0;

  return {
    run() {
      cycle += 1;
      for (let batch = 0; batch < BATCH_COUNT; batch += 1) {
        const nextValue = cycle * 1000 + batch;
        for (const index of updateOrder) {
          store.setControlledValue(fieldNames[index], nextValue);
        }
      }
    },
    teardown() {
      store.destroy();
    }
  };
}

async function createReactHookFormHarness(): Promise<Harness> {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  const deferred = createDeferred<UseFormReturn<Record<string, number>>>();

  const HarnessComponent: React.FC<{ onReady: (methods: UseFormReturn<Record<string, number>>) => void }> = ({ onReady }) => {
    const methods = useForm<Record<string, number>>({
      defaultValues,
      mode: "onChange"
    });

    useEffect(() => {
      fieldNames.forEach((name) => {
        methods.register(name as any);
      });
      onReady(methods);
      return () => {
        fieldNames.forEach((name) => methods.unregister(name));
      };
    }, [methods, onReady]);

    return null;
  };

  await act(async () => {
    root.render(<HarnessComponent onReady={deferred.resolve} />);
  });

  const methods = await deferred.promise;
  let cycle = 0;

  return {
    async run() {
      cycle += 1;
      await act(async () => {
        for (let batch = 0; batch < BATCH_COUNT; batch += 1) {
          const nextValue = cycle * 1000 + batch;
          for (const index of updateOrder) {
            methods.setValue(fieldNames[index], nextValue, {
              shouldDirty: false,
              shouldTouch: false,
              shouldValidate: false
            });
          }
        }
        await Promise.resolve();
      });
    },
    async teardown() {
      await act(async () => {
        root.unmount();
      });
      container.remove();
    }
  };
}

async function createFormikHarness(): Promise<Harness> {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  const deferred = createDeferred<FormikProps<Record<string, number>>>();

  const HarnessComponent: React.FC<{ onReady: (props: FormikProps<Record<string, number>>) => void }> = ({ onReady }) => {
    const formik = useFormik<Record<string, number>>({
      initialValues: defaultValues,
      onSubmit: () => undefined,
      validateOnBlur: false,
      validateOnChange: false,
      enableReinitialize: false
    });

    useEffect(() => {
      onReady(formik);
    }, [formik, onReady]);

    return null;
  };

  await act(async () => {
    root.render(<HarnessComponent onReady={deferred.resolve} />);
  });

  const formik = await deferred.promise;
  let cycle = 0;

  return {
    async run() {
      cycle += 1;
      await act(async () => {
        for (let batch = 0; batch < BATCH_COUNT; batch += 1) {
          const nextValue = cycle * 1000 + batch;
          for (const index of updateOrder) {
            await formik.setFieldValue(fieldNames[index], nextValue, false);
          }
        }
      });
    },
    async teardown() {
      await act(async () => {
        root.unmount();
      });
      container.remove();
    }
  };
}

function createFinalFormHarness(): Harness {
  const form = createForm<Record<string, number>>({
    initialValues: defaultValues,
    onSubmit: () => undefined
  });

  const unsubscribe = form.subscribe(() => undefined, { values: true });
  let cycle = 0;

  return {
    run() {
      cycle += 1;
      for (let batch = 0; batch < BATCH_COUNT; batch += 1) {
        const nextValue = cycle * 1000 + batch;
        for (const index of updateOrder) {
          form.change(fieldNames[index], nextValue);
        }
      }
    },
    teardown() {
      unsubscribe();
      if (typeof (form as unknown as { destroy?: () => void }).destroy === "function") {
        (form as unknown as { destroy: () => void }).destroy();
      }
    }
  };
}

async function main() {
  const rezHarness = createRezHarness();
  const reactHookFormHarness = await createReactHookFormHarness();
  const formikHarness = await createFormikHarness();
  const finalFormHarness = createFinalFormHarness();

  const bench = new Bench({ time: 200, iterations: 0 });

  bench
    .add("rezend-form", () => {
      rezHarness.run();
    })
    .add("react-hook-form", async () => {
      await reactHookFormHarness.run();
    })
    .add("formik", async () => {
      await formikHarness.run();
    })
    .add("final-form", () => {
      finalFormHarness.run();
    });

  await bench.run();
  console.table(bench.table());

  await Promise.all([
    Promise.resolve(rezHarness.teardown()),
    Promise.resolve(reactHookFormHarness.teardown()),
    Promise.resolve(formikHarness.teardown()),
    Promise.resolve(finalFormHarness.teardown())
  ]);
}

await main();
