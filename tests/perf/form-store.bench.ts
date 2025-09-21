import { Bench } from "tinybench";
import { createFormStore } from "@form/core";

const FIELD_COUNT = 1000;

/**
 * Prepare a store with a predictable set of fields.
 */
function createPreparedStore() {
  const store = createFormStore();
  for (let index = 0; index < FIELD_COUNT; index += 1) {
    store.register(`grid[${index}]`, { initialValue: index });
  }
  return store;
}

const store = createPreparedStore();
const bench = new Bench({
  time: 300,
  iterations: 0
});

bench
  .add("markDirty fan-out", () => {
    for (let index = 0; index < FIELD_COUNT; index += 1) {
      store.markDirty(`grid[${index}]`);
    }
  })
  .add("subscribe selector stability", () => {
    const unsubscribe = store.subscribe(
      (snapshot) => snapshot.getDirty("grid[0]"),
      () => {
        // noop
      }
    );
    store.markDirty("grid[0]");
    unsubscribe();
  });

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
