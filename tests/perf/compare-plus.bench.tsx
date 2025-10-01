/**
 * Comprehensive benchmark comparing Rezend Form with other popular form libraries
 * across multiple scenarios.
 *
 * This benchmark runs in Node.js using JSDOM and includes:
 * 1. High-frequency batched updates (write throughput).
 * 2. Simulated user typing on a single field with validation.
 * 3. Full form validation on submit.
 */

process.env.NODE_ENV = "test";

import { Bench } from "tinybench";
import { JSDOM } from "jsdom";
import React, { useEffect } from "react";
import { createRoot } from "react-dom/client";
import { unstable_batchedUpdates } from "react-dom";
import { useForm, UseFormReturn } from "react-hook-form";
import { useFormik, FormikProps } from "formik";
import { createForm, ValidationErrors } from "final-form";
import { createFormStore, ValidationResult } from "@form/core";
import { createFormStore as createRzfFormStore, setAtPath as rzfSetAtPath, getAtPath as rzfGetAtPath } from "react-zustand-form";

// --- Test Configuration ---
const FIELD_COUNT = 200;
const BATCH_COUNT = 10;
const UPDATES_PER_BATCH = 200;
const TYPING_ITERATIONS = 50;

const fieldNames = Array.from({ length: FIELD_COUNT }, (_, index) => `field${index}`);
const updateOrder = Array.from({ length: UPDATES_PER_BATCH }, (_, index) => index % FIELD_COUNT);
const defaultValues = fieldNames.reduce<Record<string, string>>((acc, name) => {
  acc[name] = "";
  return acc;
}, {});

// --- Harness Interfaces ---
interface Harness {
  runHighFrequencyUpdate(): Promise<void> | void;
  runTypingUpdate(): Promise<void> | void;
  runFullValidation(): Promise<void> | void;
  teardown(): Promise<void> | void;
}

type HarnessVariant = "baseline" | "best-practice";

// --- JSDOM Setup ---
const dom = new JSDOM("<!doctype html><html><body></body></html>");
const navigatorDescriptor = Object.getOwnPropertyDescriptor(globalThis, "navigator");

Object.assign(globalThis, {
  window: dom.window,
  document: dom.window.document,
  HTMLElement: dom.window.HTMLElement,
  IS_REACT_ACT_ENVIRONMENT: false,
});

if (!navigatorDescriptor || navigatorDescriptor.configurable) {
  Object.defineProperty(globalThis, "navigator", {
    value: dom.window.navigator,
    configurable: true,
    enumerable: true,
    writable: true,
  });
}

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

// --- Validation Logic ---
const validateField = (value: unknown): ValidationResult => {
    if (typeof value !== 'string' || value.length < 5) {
        return { ok: false, message: "Must be at least 5 characters" };
    }
    return { ok: true };
};

const finalFormValidator = (values: Record<string, string>): ValidationErrors => {
    const errors: ValidationErrors = {};
    for (const key in values) {
        if (typeof values[key] !== 'string' || values[key].length < 5) {
            errors[key] = "Must be at least 5 characters";
        }
    }
    return errors;
}

// --- Rezend Form Harness ---
const flushMicrotasks = async () => {
  await Promise.resolve();
  await Promise.resolve();
};

function createRezHarness(variant: HarnessVariant): Harness {
  const store = createFormStore();
  fieldNames.forEach((name) => {
    store.register(name, {
      mode: "controlled",
      initialValue: "",
      validate: validateField,
    });
  });

  let cycle = 0;

  return {
    runHighFrequencyUpdate() {
      cycle += 1;
      for (let batch = 0; batch < BATCH_COUNT; batch += 1) {
        const nextValue = (cycle * 1000 + batch).toString();
        for (const index of updateOrder) {
          store.setControlledValue(fieldNames[index], nextValue);
        }
      }
    },
    runTypingUpdate() {
        for (let i = 0; i < TYPING_ITERATIONS; i++) {
            store.setControlledValue("field0", "a".repeat(i));
            store.validate("field0");
        }
    },
    runFullValidation() {
        store.validate();
    },
    teardown() {
      store.destroy();
    },
  };
}

// --- React Zustand Form Harness ---
function createRzfHarness(variant: HarnessVariant): Harness {
  const store = createRzfFormStore<Record<string, string>>("rzf-bench", defaultValues, false);
  store.setState((state) => ({ ...state, value: state.__initial }), false, { type: "rzf:init" });

  const initialValues = store.getState().__initial;
  let currentValues = store.getState().value ?? initialValues;

  const setSingleField = (path: string, nextValue: string) => {
    store.setState((prev) => {
      const prevValues = (prev as typeof prev & { value?: Record<string, string> }).value ?? initialValues;
      const updatedValues = rzfSetAtPath(prevValues, path, nextValue) as Record<string, string>;
      const initialValue = rzfGetAtPath(initialValues, path);
      const dirtyFlag = String(nextValue) !== String((initialValue as string | undefined) ?? "");
      const prevDirty = prev.formState.dirtyFields[path];
      const prevTouched = prev.formState.touchedFields[path];

      let dirtyFields = prev.formState.dirtyFields;
      let touchedFields = prev.formState.touchedFields;
      if (prevDirty !== dirtyFlag) {
        dirtyFields = { ...dirtyFields, [path]: dirtyFlag };
      }
      if (!prevTouched) {
        touchedFields = { ...touchedFields, [path]: true };
      }

      const formState =
        dirtyFields !== prev.formState.dirtyFields || touchedFields !== prev.formState.touchedFields
          ? {
              ...prev.formState,
              dirtyFields,
              touchedFields,
            }
          : prev.formState;

      if (updatedValues === prevValues && formState === prev.formState) {
        return prev;
      }

      return {
        ...prev,
        value: updatedValues,
        formState,
      };
    }, false, { type: `rzf:set:${path}` });

    currentValues = store.getState().value ?? initialValues;
  };

  const applyBatchUpdate = (entries: Array<[string, string]>) => {
    if (entries.length === 0) {
      return;
    }

    store.setState((prev) => {
      const prevValues = (prev as typeof prev & { value?: Record<string, string> }).value ?? initialValues;
      let nextValues = prevValues;
      let valuesChanged = false;

      for (const [path, value] of entries) {
        const updated = rzfSetAtPath(nextValues, path, value) as Record<string, string>;
        if (updated !== nextValues) {
          nextValues = updated;
          valuesChanged = true;
        }
      }

      let dirtyFields = prev.formState.dirtyFields;
      let touchedFields = prev.formState.touchedFields;
      let dirtyChanged = false;
      let touchedChanged = false;

      for (const [path, value] of entries) {
        const initialValue = rzfGetAtPath(initialValues, path);
        const dirtyFlag = String(value) !== String((initialValue as string | undefined) ?? "");
        if (dirtyFields[path] !== dirtyFlag) {
          if (!dirtyChanged) {
            dirtyFields = { ...dirtyFields };
            dirtyChanged = true;
          }
          dirtyFields[path] = dirtyFlag;
        }
        if (!touchedFields[path]) {
          if (!touchedChanged) {
            touchedFields = { ...touchedFields };
            touchedChanged = true;
          }
          touchedFields[path] = true;
        }
      }

      if (!valuesChanged && !dirtyChanged && !touchedChanged) {
        return prev;
      }

      let formState = prev.formState;
      if (dirtyChanged || touchedChanged) {
        formState = {
          ...prev.formState,
          dirtyFields,
          touchedFields,
        };
      }

      return {
        ...prev,
        value: valuesChanged ? nextValues : prev.value,
        formState,
      };
    }, false, { type: "rzf:batch" });

    currentValues = store.getState().value ?? initialValues;
  };

  const validatePath = (path: string) => {
    const result = validateField(rzfGetAtPath(currentValues, path));
    const message = result.ok ? undefined : result.message ?? "Must be at least 5 characters";

    store.setState((prev) => {
      const prevMessage = prev.formState.errors[path];
      if (message === undefined) {
        if (prevMessage === undefined) {
          return prev;
        }
        const nextErrors = { ...prev.formState.errors };
        delete nextErrors[path];
        return {
          ...prev,
          formState: {
            ...prev.formState,
            errors: nextErrors,
          },
        };
      }

      if (prevMessage === message) {
        return prev;
      }

      return {
        ...prev,
        formState: {
          ...prev.formState,
          errors: {
            ...prev.formState.errors,
            [path]: message,
          },
        },
      };
    }, false, { type: `rzf:validate:${path}` });
  };

  const validateAll = () => {
    store.setState((prev) => {
      const values = ((prev as typeof prev & { value?: Record<string, string> }).value ?? initialValues) as Record<string, string>;
      let errors = prev.formState.errors;
      let changed = false;

      for (const path of fieldNames) {
        const result = validateField(rzfGetAtPath(values, path));
        const message = result.ok ? undefined : result.message ?? "Must be at least 5 characters";
        const prevMessage = errors[path];

        if (message === undefined) {
          if (prevMessage !== undefined) {
            if (!changed) {
              errors = { ...errors };
              changed = true;
            }
            delete errors[path];
          }
        } else if (prevMessage !== message) {
          if (!changed) {
            errors = { ...errors };
            changed = true;
          }
          errors[path] = message;
        }
      }

      if (!changed) {
        return prev;
      }

      return {
        ...prev,
        formState: {
          ...prev.formState,
          errors,
        },
      };
    }, false, { type: "rzf:validateAll" });
  };

  let cycle = 0;

  return {
    runHighFrequencyUpdate() {
      cycle += 1;
      if (variant === "baseline") {
        for (let batch = 0; batch < BATCH_COUNT; batch += 1) {
          const nextValue = (cycle * 1000 + batch).toString();
          for (const index of updateOrder) {
            setSingleField(fieldNames[index], nextValue);
          }
        }
      } else {
        for (let batch = 0; batch < BATCH_COUNT; batch += 1) {
          const nextValue = (cycle * 1000 + batch).toString();
          const updates: Array<[string, string]> = [];
          for (const index of updateOrder) {
            updates.push([fieldNames[index], nextValue]);
          }
          applyBatchUpdate(updates);
        }
      }
    },
    runTypingUpdate() {
      if (variant === "baseline") {
        for (let i = 0; i < TYPING_ITERATIONS; i += 1) {
          const value = "a".repeat(i);
          setSingleField("field0", value);
          validatePath("field0");
        }
      } else {
        let lastValue = "";
        for (let i = 0; i < TYPING_ITERATIONS; i += 1) {
          lastValue = "a".repeat(i);
          setSingleField("field0", lastValue);
        }
        validatePath("field0");
      }
    },
    runFullValidation() {
      validateAll();
    },
    teardown() {
      store.setState((prev) => ({
        ...prev,
        value: prev.__initial,
        formState: {
          dirtyFields: {},
          touchedFields: {},
          errors: {},
        },
      }), false, { type: "rzf:teardown" });
    },
  };
}

// --- React Hook Form Harness ---
async function createReactHookFormHarness(variant: HarnessVariant): Promise<Harness> {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  const deferred = createDeferred<UseFormReturn<Record<string, string>>>();

  const HarnessComponent: React.FC<{ onReady: (methods: UseFormReturn<Record<string, string>>) => void }> = ({ onReady }) => {
    const methods = useForm<Record<string, string>>({
      defaultValues,
      mode: "onChange",
    });

    useEffect(() => {
      fieldNames.forEach((name) => {
        methods.register(name as any, { minLength: 5 });
      });
      onReady(methods);
    }, [methods, onReady]);

    return null;
  };

  root.render(<HarnessComponent onReady={deferred.resolve} />);

  const methods = await deferred.promise;
  let cycle = 0;
  let accumulatedValues = { ...defaultValues };

  return {
    async runHighFrequencyUpdate() {
      cycle += 1;
      if (variant === "baseline") {
        unstable_batchedUpdates(() => {
          for (let batch = 0; batch < BATCH_COUNT; batch += 1) {
            const nextValue = (cycle * 1000 + batch).toString();
            for (const index of updateOrder) {
              methods.setValue(fieldNames[index], nextValue, { shouldValidate: false, shouldDirty: true });
            }
          }
        });
      } else {
        unstable_batchedUpdates(() => {
          for (let batch = 0; batch < BATCH_COUNT; batch += 1) {
            const nextValue = (cycle * 1000 + batch).toString();
            const nextValues = { ...accumulatedValues };
            for (const index of updateOrder) {
              nextValues[fieldNames[index]] = nextValue;
            }
            accumulatedValues = nextValues;
            methods.reset(nextValues, {
              keepDefaultValues: true,
              keepDirty: true,
              keepDirtyValues: true,
              keepErrors: true,
              keepTouched: true,
            });
          }
        });
      }
      await flushMicrotasks();
    },
    async runTypingUpdate() {
        if (variant === "baseline") {
          unstable_batchedUpdates(() => {
            for (let i = 0; i < TYPING_ITERATIONS; i++) {
              methods.setValue("field0", "a".repeat(i), { shouldValidate: true, shouldDirty: true });
            }
          });
          await flushMicrotasks();
        } else {
          unstable_batchedUpdates(() => {
            for (let i = 0; i < TYPING_ITERATIONS; i++) {
              methods.setValue("field0", "a".repeat(i), { shouldValidate: false, shouldDirty: true });
            }
          });
          await flushMicrotasks();
          let validationPromise: Promise<boolean>;
          unstable_batchedUpdates(() => {
            validationPromise = methods.trigger("field0");
          });
          await validationPromise!;
        }
    },
    async runFullValidation() {
        let triggerPromise: Promise<boolean>;
        unstable_batchedUpdates(() => {
            triggerPromise = methods.trigger();
        });
        await triggerPromise!;
    },
    async teardown() {
      root.unmount();
      container.remove();
    },
  };
}

// --- Formik Harness ---
async function createFormikHarness(variant: HarnessVariant): Promise<Harness> {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    const deferred = createDeferred<FormikProps<Record<string, string>>>();

    const HarnessComponent: React.FC<{ onReady: (props: FormikProps<Record<string, string>>) => void }> = ({ onReady }) => {
        const formik = useFormik<Record<string, string>>({
            initialValues: defaultValues,
            validate: (values) => {
                const errors: Record<string, string> = {};
                for (const key in values) {
                    if (values[key].length < 5) {
                        errors[key] = "Must be at least 5 characters";
                    }
                }
                return errors;
            },
            onSubmit: () => {}, 
            validateOnChange: true,
        });
        useEffect(() => { onReady(formik) }, [formik, onReady]);
        return null;
    };

    root.render(<HarnessComponent onReady={deferred.resolve} />);

    const formik = await deferred.promise;
    let cycle = 0;
    let accumulatedValues = { ...defaultValues };

    return {
        async runHighFrequencyUpdate() {
            cycle += 1;
            if (variant === "baseline") {
                const tasks: Promise<unknown>[] = [];
                unstable_batchedUpdates(() => {
                    for (let batch = 0; batch < BATCH_COUNT; batch += 1) {
                        const nextValue = (cycle * 1000 + batch).toString();
                        for (const index of updateOrder) {
                            tasks.push(formik.setFieldValue(fieldNames[index], nextValue, false));
                        }
                    }
                });
                await Promise.all(tasks);
            } else {
                unstable_batchedUpdates(() => {
                    for (let batch = 0; batch < BATCH_COUNT; batch += 1) {
                        const nextValue = (cycle * 1000 + batch).toString();
                        const nextValues = { ...accumulatedValues };
                        for (const index of updateOrder) {
                            nextValues[fieldNames[index]] = nextValue;
                        }
                        accumulatedValues = nextValues;
                        formik.setValues(nextValues, false);
                    }
                });
            }
            await flushMicrotasks();
        },
        async runTypingUpdate() {
            if (variant === "baseline") {
                const tasks: Promise<unknown>[] = [];
                unstable_batchedUpdates(() => {
                    for (let i = 0; i < TYPING_ITERATIONS; i++) {
                        tasks.push(formik.setFieldValue("field0", "a".repeat(i), true));
                    }
                });
                await Promise.all(tasks);
            } else {
                unstable_batchedUpdates(() => {
                    for (let i = 0; i < TYPING_ITERATIONS; i++) {
                        accumulatedValues = {
                            ...accumulatedValues,
                            field0: "a".repeat(i),
                        };
                        formik.setValues(accumulatedValues, false);
                    }
                });
                let validation: Promise<Record<string, string>>;
                unstable_batchedUpdates(() => {
                    validation = formik.validateForm();
                });
                await validation!;
                await flushMicrotasks();
                return;
            }
            await flushMicrotasks();
        },
        async runFullValidation() {
            let validationPromise: Promise<Record<string, string>>;
            unstable_batchedUpdates(() => {
                validationPromise = formik.validateForm();
            });
            await validationPromise!;
        },
        async teardown() {
            root.unmount();
            container.remove();
        }
    };
}


// --- Final Form Harness ---
function createFinalFormHarness(variant: HarnessVariant): Harness {
  const form = createForm<Record<string, string>>({
    initialValues: defaultValues,
    validate: finalFormValidator,
    onSubmit: () => {},
  });

  let cycle = 0;

  return {
    runHighFrequencyUpdate() {
      cycle += 1;
      const runner = () => {
        for (let batch = 0; batch < BATCH_COUNT; batch += 1) {
          const nextValue = (cycle * 1000 + batch).toString();
          for (const index of updateOrder) {
            form.change(fieldNames[index], nextValue);
          }
        }
      };
      if (variant === "best-practice" && "batch" in form) {
        (form as unknown as { batch?: (fn: () => void) => void }).batch?.(runner);
      } else {
        runner();
      }
    },
    runTypingUpdate() {
        const runner = () => {
            for (let i = 0; i < TYPING_ITERATIONS; i++) {
                form.change("field0", "a".repeat(i));
            }
        };
        if (variant === "best-practice" && "batch" in form) {
            (form as unknown as { batch?: (fn: () => void) => void }).batch?.(runner);
        } else {
            runner();
        }
    },
    runFullValidation() {
        if (variant === "best-practice" && "batch" in form) {
            (form as unknown as { batch?: (fn: () => void) => void }).batch?.(() => {
                form.submit();
            });
        } else {
            form.submit();
        }
    },
    teardown() {
      // Final form has its own teardown logic
    },
  };
}


// --- Main Benchmark Runner ---
async function main() {
  const harnessDescriptors: Array<{
    label: string;
    framework: string;
    variant: HarnessVariant;
    create: () => Promise<Harness> | Harness;
    notes?: string;
  }> = [
    {
      label: "rezend-form",
      framework: "rezend-form",
      variant: "baseline",
      create: () => createRezHarness("baseline"),
      notes: "Store already batches mutations via microtasks.",
    },
    {
      label: "rezend-form (best-practice)",
      framework: "rezend-form",
      variant: "best-practice",
      create: () => createRezHarness("best-practice"),
      notes: "Same as baseline; no additional batching knobs exposed yet.",
    },
    {
      label: "react-zustand-form",
      framework: "react-zustand-form",
      variant: "baseline",
      create: () => createRzfHarness("baseline"),
      notes: "Plain store with per-field updates and inline validation.",
    },
    {
      label: "react-zustand-form (best-practice)",
      framework: "react-zustand-form",
      variant: "best-practice",
      create: () => createRzfHarness("best-practice"),
      notes: "Batches updates per cycle and defers validation until flush.",
    },
    {
      label: "react-hook-form",
      framework: "react-hook-form",
      variant: "baseline",
      create: () => createReactHookFormHarness("baseline"),
      notes: "Naive per-field updates with validation on change.",
    },
    {
      label: "react-hook-form (best-practice)",
      framework: "react-hook-form",
      variant: "best-practice",
      create: () => createReactHookFormHarness("best-practice"),
      notes: "Bulk reset per batch + manual validation trigger.",
    },
    {
      label: "formik",
      framework: "formik",
      variant: "baseline",
      create: () => createFormikHarness("baseline"),
      notes: "Per-field updates with validation on change.",
    },
    {
      label: "formik (best-practice)",
      framework: "formik",
      variant: "best-practice",
      create: () => createFormikHarness("best-practice"),
      notes: "Uses setValues batching and defers validation.",
    },
    {
      label: "final-form",
      framework: "final-form",
      variant: "baseline",
      create: () => createFinalFormHarness("baseline"),
      notes: "Direct change calls without explicit batching.",
    },
    {
      label: "final-form (best-practice)",
      framework: "final-form",
      variant: "best-practice",
      create: () => createFinalFormHarness("best-practice"),
      notes: "Wraps operations in form.batch when available.",
    },
  ];

  const harnessEntries = [] as Array<(typeof harnessDescriptors)[number] & { harness: Harness }>;
  for (const descriptor of harnessDescriptors) {
    const harness = await Promise.resolve(descriptor.create());
    harnessEntries.push({ ...descriptor, harness });
  }

  const bench = new Bench({ time: 200, iterations: 10 });

  console.log("--- Scenario 1: High-Frequency Batched Updates ---");
  for (const entry of harnessEntries) {
      bench.add(entry.label, async () => {
          await entry.harness.runHighFrequencyUpdate();
      });
  }
  await bench.run();
  console.table(bench.table());
  bench.tasks.length = 0; // Clear tasks for next scenario

  console.log("\n--- Scenario 2: Simulated User Typing with Validation ---");
  for (const entry of harnessEntries) {
      bench.add(entry.label, async () => {
          await entry.harness.runTypingUpdate();
      });
  }
  await bench.run();
  console.table(bench.table());
  bench.tasks.length = 0;

  console.log("\n--- Scenario 3: Full Form Validation ---");
  for (const entry of harnessEntries) {
      bench.add(entry.label, async () => {
          await entry.harness.runFullValidation();
      });
  }
  await bench.run();
  console.table(bench.table());

  // Teardown
  for (const entry of harnessEntries) {
      await entry.harness.teardown();
  }

  console.log("\nBenchmark Conditions:");
  console.log(`- Node: ${process.version}`);
  console.log(`- React DOM batching: unstable_batchedUpdates`);
  console.log(`- Field count: ${FIELD_COUNT}, batches: ${BATCH_COUNT}, updates per batch: ${UPDATES_PER_BATCH}`);
  console.log(`- Typing iterations: ${TYPING_ITERATIONS}`);
  console.log("\nHarness Notes:");
  for (const entry of harnessEntries) {
    console.log(`- ${entry.label} → ${entry.notes ?? "(no additional notes)"}`);
  }
}

await main();
