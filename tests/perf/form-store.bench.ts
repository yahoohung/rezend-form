import { Bench } from "tinybench";
import { createFormStore, FormStore } from "@form/core";

const FIELD_COUNT = 1000; // Increased for more significant load
const DEEP_PATH_DEPTH = 5; // For deep path tests

/**
 * Prepare a store with a predictable set of fields.
 * This setup will be used for multiple benchmarks.
 */
function createPreparedStore(numFields: number = FIELD_COUNT): FormStore {
  const store = createFormStore();
  for (let index = 0; index < numFields; index += 1) {
    store.register(`grid[${index}]`, {
      mode: "controlled",
      initialValue: index,
      validate: (value) => ({ ok: typeof value === "number" }) // Add a simple validator
    });
    // Add a subscriber for each field to simulate many components listening
    store.subscribe((s) => s.getDirty(`grid[${index}]`), () => {});
  }

  let currentDeepPath = "deep";
  for (let i = 0; i < DEEP_PATH_DEPTH; i++) {
    currentDeepPath += `.${i}`;
  }
  store.register(currentDeepPath, { mode: "controlled", initialValue: 0 });
  return store;
}

const bench = new Bench({
  time: 300,
  iterations: 0
});

bench
  // Benchmark 1: Registering many fields
  .add(`register ${FIELD_COUNT} fields`, () => {
    const store = createFormStore();
    const unregisters: (() => void)[] = [];
    for (let i = 0; i < FIELD_COUNT; i += 1) {
      unregisters.push(store.register(`dynamic[${i}]`, { initialValue: i }));
    }
    // Cleanup to avoid memory leaks between iterations
    unregisters.forEach(unreg => unreg());
  })
  // Benchmark 2: Unregistering many fields
  .add(`unregister ${FIELD_COUNT} fields`, () => {
    const store = createFormStore();
    const unregisters: (() => void)[] = [];
    for (let i = 0; i < FIELD_COUNT; i += 1) {
      unregisters.push(store.register(`dynamic[${i}]`, { initialValue: i }));
    }
    // The actual operation being benchmarked
    unregisters.forEach(unreg => unreg());
  })
  // Benchmark 3: Repeatedly setting controlled value on a single field
  .add("setControlledValue (single field, repeated)", () => {
    const store = createFormStore();
    store.register("single.field", { mode: "controlled", initialValue: 0 });
    store.subscribe((s) => s.getDirty("single.field"), () => {}); // Add a subscriber
    for (let i = 0; i < 100; i++) { // Repeat many times within one iteration
      store.setControlledValue("single.field", i);
    }
  })
  // Benchmark 4: MarkDirty fan-out (many fields, many subscribers)
  // This uses the prepared store with FIELD_COUNT fields and subscribers
  .add(`markDirty fan-out (${FIELD_COUNT} fields, ${FIELD_COUNT} subscribers)`, () => {
    const preparedStore = createPreparedStore();
    for (let index = 0; index < FIELD_COUNT; index += 1) {
      preparedStore.markDirty(`grid[${index}]`);
    }
  })
  // Benchmark 5: SetControlledValue fan-out (many fields, many subscribers)
  .add(`setControlledValue fan-out (${FIELD_COUNT} fields, ${FIELD_COUNT} subscribers)`, () => {
    const preparedStore = createPreparedStore();
    for (let index = 0; index < FIELD_COUNT; index += 1) {
      preparedStore.setControlledValue(`grid[${index}]`, index + 1);
    }
  })
  // Benchmark 6: Subscribe selector stability (already exists, but now with more fields)
  .add("subscribe selector stability (single field)", () => {
    const preparedStore = createPreparedStore();
    const unsubscribe = preparedStore.subscribe(
      (snapshot) => snapshot.getDirty("grid[0]"),
      () => {
        // noop
      }
    );
    preparedStore.markDirty("grid[0]");
    unsubscribe();
  })
  // Benchmark 7: Deep path set (already exists, but now with deeper path)
  .add("deep path set", () => {
    const preparedStore = createPreparedStore();
    let currentDeepPath = "deep";
    for (let i = 0; i < DEEP_PATH_DEPTH; i++) {
      currentDeepPath += `.${i}`;
    }
    preparedStore.setControlledValue(currentDeepPath, Math.random());
  })
  // Benchmark 8: Full form validation (many fields, many validators)
  .add(`validation (full form, ${FIELD_COUNT} fields)`, () => {
    const preparedStore = createPreparedStore();
    preparedStore.validate();
  })
  // Benchmark 9: Read many uncontrolled fields
  .add(`read (${FIELD_COUNT} uncontrolled fields)`, () => {
    const store = createFormStore();
    for (let index = 0; index < FIELD_COUNT; index += 1) {
      store.register(`uncontrolled[${index}]`, { mode: "uncontrolled", initialValue: index });
    }
    store.read((path) => {
      const match = path.match(/\[(\d+)\]/);
      return match ? parseInt(match[1], 10) + 1 : 0; // Simulate changing value
    });
  })
  // Benchmark 10: Watch wildcard fan-out (many fields, one wildcard watcher)
  .add(`watch (${FIELD_COUNT} fields, 1 wildcard watcher)`, () => {
    const preparedStore = createPreparedStore();
    preparedStore.watch("grid[*]", () => {
      // noop
    });
    for (let index = 0; index < FIELD_COUNT; index += 1) {
      preparedStore.setControlledValue(`grid[${index}]`, index + 1);
    }
  })
  // Benchmark 11: Watch many specific path watchers
  .add(`watch (${FIELD_COUNT} fields, ${FIELD_COUNT} specific watchers)`, () => {
    const store = createFormStore();
    const specificWatchUnregisters: (() => void)[] = [];
    for (let i = 0; i < FIELD_COUNT; i++) {
      store.register(`specific[${i}]`, { mode: "controlled", initialValue: i });
      specificWatchUnregisters.push(store.watch(`specific[${i}]`, () => {}));
    }
    for (let index = 0; index < FIELD_COUNT; index += 1) {
      store.setControlledValue(`specific[${index}]`, index + 1);
    }
    specificWatchUnregisters.forEach(unreg => unreg()); // Cleanup
  })

await bench.warmup();
await bench.run();

const results = bench.tasks.map((task) => {
  const result = task.result;
  if (!result) {
    return {
      Task: task.name,
      "ops/sec": "n/a",
      "margin%": "n/a",
      Samples: 0
    } as const;
  }

  return {
    Task: task.name,
    "ops/sec": result.hz.toFixed(0),
    "margin%": (result.rme ?? 0).toFixed(2),
    Samples: result.samples.length
  } as const;
});

console.table(results);
