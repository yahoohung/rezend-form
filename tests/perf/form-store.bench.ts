import { Bench } from "tinybench";
import { createFormStore, FormStore } from "@form/core";

const GRID_ROWS = 60;
const GRID_COLS = 60;
const TOTAL_FIELDS = GRID_ROWS * GRID_COLS;
const PARTIAL_UPDATE_RATIO = 0.10;
const PARTIAL_UPDATE_COUNT = Math.floor(TOTAL_FIELDS * PARTIAL_UPDATE_RATIO);
const DEEP_PATH_DEPTH = 5; // For deep path tests

function cellPathFromIndex(index: number, cols: number = GRID_COLS) {
  const row = Math.floor(index / cols);
  const col = index % cols;
  return `grid[${row}][${col}]`;
}

function forEachCell(rows: number, cols: number, iteratee: (row: number, col: number, index: number) => void) {
  let index = 0;
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      iteratee(row, col, index);
      index += 1;
    }
  }
}

/**
 * Prepare a store with a predictable set of fields.
 * This setup will be used for multiple benchmarks.
 */
function createPreparedStore(rows: number = GRID_ROWS, cols: number = GRID_COLS): FormStore {
  const store = createFormStore();
  forEachCell(rows, cols, (row, col, index) => {
    const path = `grid[${row}][${col}]`;
    store.register(path, {
      mode: "controlled",
      initialValue: index,
      validate: (value) => ({ ok: typeof value === "number" })
    });
    store.subscribe((s) => s.getDirty(path), () => {});
  });

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
  .add(`register ${TOTAL_FIELDS} fields`, () => {
    const store = createFormStore();
    const unregisters: (() => void)[] = [];
    for (let i = 0; i < TOTAL_FIELDS; i += 1) {
      unregisters.push(store.register(`dynamic[${i}]`, { initialValue: i }));
    }
    // Cleanup to avoid memory leaks between iterations
    unregisters.forEach(unreg => unreg());
  })
  // Benchmark 2: Unregistering many fields
  .add(`unregister ${TOTAL_FIELDS} fields`, () => {
    const store = createFormStore();
    const unregisters: (() => void)[] = [];
    for (let i = 0; i < TOTAL_FIELDS; i += 1) {
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
  // This uses the prepared store with TOTAL_FIELDS fields and subscribers
  .add(`markDirty fan-out (${TOTAL_FIELDS} fields, ${TOTAL_FIELDS} subscribers)`, () => {
    const preparedStore = createPreparedStore();
    forEachCell(GRID_ROWS, GRID_COLS, (row, col) => {
      preparedStore.markDirty(`grid[${row}][${col}]`);
    });
  })
  // Benchmark 5: SetControlledValue fan-out (many fields, many subscribers, 10% updates)
  .add(`setControlledValue fan-out (${TOTAL_FIELDS} fields, 10% updates)`, () => {
    const preparedStore = createPreparedStore();
    for (let index = 0; index < PARTIAL_UPDATE_COUNT; index += 1) {
      preparedStore.setControlledValue(cellPathFromIndex(index), index + 1);
    }
  })
  // Benchmark 6: Subscribe selector stability (already exists, but now with more fields)
  .add("subscribe selector stability (single field)", () => {
    const preparedStore = createPreparedStore();
    const unsubscribe = preparedStore.subscribe(
      (snapshot) => snapshot.getDirty("grid[0][0]"),
      () => {
        // noop
      }
    );
    preparedStore.markDirty("grid[0][0]");
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
  .add(`validation (full form, ${TOTAL_FIELDS} fields)`, () => {
    const preparedStore = createPreparedStore();
    preparedStore.validate();
  })
  // Benchmark 9: Read many uncontrolled fields
  .add(`read (${TOTAL_FIELDS} uncontrolled fields)`, () => {
    const store = createFormStore();
    for (let index = 0; index < TOTAL_FIELDS; index += 1) {
      store.register(`uncontrolled[${index}]`, { mode: "uncontrolled", initialValue: index });
    }
    store.read((path) => {
      const match = path.match(/\[(\d+)\]/);
      return match ? parseInt(match[1], 10) + 1 : 0; // Simulate changing value
    });
  })
  // Benchmark 10: Watch wildcard fan-out (many fields, one wildcard watcher)
  // .add(`watch (${TOTAL_FIELDS} fields, 1 wildcard watcher)`, () => {
  //   const preparedStore = createPreparedStore();
  //   preparedStore.watch("grid[*][*]", () => {
  //     // noop
  //   });
  //   for (let index = 0; index < PARTIAL_UPDATE_COUNT; index += 1) {
  //     preparedStore.setControlledValue(cellPathFromIndex(index), index + 1);
  //   }
  // })
  // Benchmark 11: Watch many specific path watchers
  .add(`watch (${TOTAL_FIELDS} fields, ${TOTAL_FIELDS} specific watchers)`, () => {
    const store = createFormStore();
    const specificWatchUnregisters: (() => void)[] = [];
    for (let i = 0; i < TOTAL_FIELDS; i++) {
      store.register(`specific[${i}]`, { mode: "controlled", initialValue: i });
      specificWatchUnregisters.push(store.watch(`specific[${i}]`, () => {}));
    }
    for (let index = 0; index < PARTIAL_UPDATE_COUNT; index += 1) {
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
