import {
  createFormStore,
  parsePath,
  setAtPath,
  isMatch,
  getAtPath,
  type Plugin,
  type Validator
} from "@form/core";

describe("createFormStore", () => {
  it("marks fields touched and dirty independently", () => {
    const store = createFormStore();
    const unregister = store.register("user.email", { initialValue: "" });

    expect(store.getTouched("user.email")).toBe(false);
    expect(store.getDirty("user.email")).toBe(false);

    store.markTouched("user.email");
    expect(store.getTouched("user.email")).toBe(true);

    store.markDirty("user.email");
    expect(store.getDirty("user.email")).toBe(true);

    unregister();
  });

  it("updates dirty state for controlled fields", () => {
    const store = createFormStore();
    store.register("user.count", { mode: "controlled", initialValue: 1 });

    expect(store.getDirty("user.count")).toBe(false);

    store.setControlledValue("user.count", 2);
    expect(store.getDirty("user.count")).toBe(true);

    store.setControlledValue("user.count", 1);
    expect(store.getDirty("user.count")).toBe(false);
  });

  it("supports subscribe with selector stability", async () => {
    const store = createFormStore();
    store.register("flag");

    const seen: boolean[] = [];
    const unsubscribe = store.subscribe(
      (s) => s.getTouched("flag"),
      (value) => {
        seen.push(value);
      }
    );

    store.markTouched("flag");
    store.markTouched("flag");

    await new Promise((resolve) => queueMicrotask(resolve));

    expect(seen).toEqual([false, true]);

    unsubscribe();
  });

  it("fires subscribe callback immediately with the initial value", () => {
    const store = createFormStore();
    store.register("flag", { initialValue: "initial" });

    const seen: unknown[] = [];
    const unsubscribe = store.subscribe(
      (s) => s.getDirty("flag"), // This will be `false` initially
      (value) => {
        seen.push(value);
      }
    );

    expect(seen).toEqual([false]);
    unsubscribe();
  });

  it("notifies watchers with the latest controlled value", async () => {
    const store = createFormStore();
    store.register("field", { mode: "controlled", initialValue: "a" });

    const seen: Array<{ path: string; value: unknown }> = [];
    const unwatch = store.watch("field", (change) => seen.push(change));

    store.setControlledValue("field", "b");
    store.setControlledValue("field", "c");

    await new Promise((resolve) => queueMicrotask(resolve));

    expect(seen).toEqual([
      { path: "field", value: "b" },
      { path: "field", value: "c" }
    ]);

    unwatch();
  });

  it("notifies watchers for uncontrolled value reads", async () => {
    const store = createFormStore();
    store.register("field", { initialValue: "" });

    const seen: Array<{ path: string; value: unknown }> = [];
    store.watch("field", (change) => {
      seen.push(change);
    });

    let domValue = "first";
    store.read(() => domValue);
    domValue = "second";
    store.read(() => domValue);

    await new Promise((resolve) => queueMicrotask(resolve));

    expect(seen).toEqual([
      { path: "field", value: "first" },
      { path: "field", value: "second" }
    ]);
  });

  it("passes the latest uncontrolled value into validators", async () => {
    const values: unknown[] = [];
    const validator: Validator = (value) => {
      values.push(value);
      return { ok: value === "ok" };
    };

    const store = createFormStore({
      plugins: [{ name: "test", setup: (ctx) => ctx.addValidator("field", validator) }]
    });
    store.register("field", { initialValue: "" });

    store.read(() => "ok");

    await new Promise((resolve) => queueMicrotask(resolve));

    const result = store.validate("field");

    expect(result).toEqual({ ok: true });
    expect(values).toEqual(["ok"]);
  });

  it("handles full-form async validation", async () => {
    const validatorA: Validator = () => Promise.resolve({ ok: true });
    const validatorB: Validator = () => Promise.resolve({ ok: false, message: "B failed" });

    const store = createFormStore({
      plugins: [
        {
          name: "test",
          setup(ctx) {
            ctx.addValidator("a", validatorA);
            ctx.addValidator("b", validatorB);
          }
        }
      ]
    });
    store.register("a");
    store.register("b");

    const result = await store.validate();

    expect(result).toEqual({ ok: false, message: "B failed" });
  });

  it("resets dirty state when a new initial value is provided", () => {
    const store = createFormStore();
    const firstCleanup = store.register("user.count", { mode: "controlled", initialValue: 1 });

    store.setControlledValue("user.count", 2);
    expect(store.getDirty("user.count")).toBe(true);

    const secondCleanup = store.register("user.count", { mode: "controlled", initialValue: 2 });

    expect(store.getDirty("user.count")).toBe(false);

    secondCleanup();
    firstCleanup();
  });

  it("clears stale errors when validators are removed", () => {
    let removeValidator: (() => void) | undefined;
    const validator: Validator = (value) =>
      typeof value === "string" && value === "ok"
        ? { ok: true }
        : { ok: false, message: "not ok" };

    const plugin: Plugin = {
      name: "validator",
      setup(ctx) {
        removeValidator = ctx.addValidator("user.email", validator);
      }
    };

    const store = createFormStore({ plugins: [plugin] });
    store.register("user.email", { mode: "controlled", initialValue: "" });

    store.setControlledValue("user.email", "fail");
    expect(store.validate("user.email")).toEqual({ ok: false, message: "not ok" });
    expect(store.getError("user.email")).toBe("not ok");

    removeValidator?.();

    expect(store.validate("user.email")).toEqual({ ok: true });
    expect(store.getError("user.email")).toBeNull();
  });

  it("runs plugin cleanups when the store is destroyed", () => {
    const calls: string[] = [];
    const plugin: Plugin = {
      name: "cleanup",
      setup(ctx) {
        return () => {
          calls.push("plugin-cleanup");
        };
      }
    };

    const store = createFormStore({ plugins: [plugin] });
    store.register("field");

    expect(calls).toEqual([]);

    store.destroy();

    expect(calls).toEqual(["plugin-cleanup"]);
  });

  it("runs event listener cleanups when the store is destroyed", () => {
    const calls: string[] = [];
    const plugin: Plugin = {
      name: "event-cleanup-plugin",
      setup(ctx) {
        ctx.on("register", () => {
          // This event listener returns a cleanup function
          return () => {
            calls.push("event-cleanup-ran");
          };
        });
      }
    };

    const store = createFormStore({ plugins: [plugin] });
    store.register("field");

    expect(calls).toEqual([]);

    store.destroy();
    expect(calls).toEqual(["event-cleanup-ran"]);
  });

  it("continues running cleanups and throws the first error", () => {
    const calls: string[] = [];
    const erroringPlugin: Plugin = {
      name: "erroring",
      setup() {
        return () => {
          calls.push("error-cleanup-ran");
          throw new Error("Cleanup failed");
        };
      }
    };

    const goodPlugin: Plugin = {
      name: "good",
      setup() {
        return () => {
          calls.push("good-cleanup-ran");
        };
      }
    };

    const store = createFormStore({ plugins: [erroringPlugin, goodPlugin] });

    expect(() => store.destroy()).toThrow("Cleanup failed");
    expect(calls).toContain("error-cleanup-ran");
    expect(calls).toContain("good-cleanup-ran");
  });

  it("runs middleware for mutations", async () => {
    const calls: string[] = [];
    const middleware =
      (next) =>
      (ctx): void => {
        calls.push(`before:${ctx.type}`);
        next(ctx);
        calls.push(`after:${ctx.type}`);
      };

    const store = createFormStore({ middleware: [middleware] });
    store.register("field");

    await new Promise((resolve) => queueMicrotask(resolve));

    expect(calls).toEqual([
      "before:register",
      "after:register"
    ]);
  });
});

describe("path helpers", () => {
  it("parses dotted and bracket notation", () => {
    const tokens = parsePath("rows[2].price");
    expect(tokens).toEqual(["rows", "2", "price"]);
  });

  it("matches wildcard paths", () => {
    expect(isMatch(["a", "*", "c"], ["a", "1", "c"])).toBe(true);
    expect(isMatch(["a", "*"], ["a", "1"])).toBe(true);
    expect(isMatch(["a", "*"], ["a", "1", "b"])).toBe(false); // No longer matches prefix
    expect(isMatch(["a", "*", "c"], ["a", "1", "d"])).toBe(false);
    expect(isMatch(["a", "*"], ["b", "1"])).toBe(false);
    expect(isMatch(["a"], ["a", "b"])).toBe(false);
    expect(isMatch([], [])).toBe(false);
    expect(isMatch(["a"], [])).toBe(false);
  });

  it("gets and sets values without changing untouched branches", () => {
    const original = { rows: [{ price: 10 }, { price: 20 }] };
    const tokens = parsePath("rows[1].price");
    const next = setAtPath(original, tokens, (prev) => (Number(prev) ?? 0) + 5);

    expect(getAtPath(next, tokens)).toBe(25);
    expect(getAtPath(original, tokens)).toBe(20);
    expect(next.rows[0]).toBe(original.rows[0]);
  });

  it("sets values on null or undefined branches", () => {
    const original = { user: null };
    const next = setAtPath(original, ["user", "name"], "test");
    expect(next).toEqual({ user: { name: "test" } });
  });

  it("gets undefined for paths into null or undefined", () => {
    const obj = { user: null, other: { name: "test" } };
    expect(getAtPath(obj, ["user", "name"])).toBeUndefined();
  });

  it("setAtPath returns original object for no-op updates", () => {
    const original = { value: 10, nested: { value: 20 } };
    const next = setAtPath(original, ["value"], 10);
    expect(next).toBe(original);

    const next2 = setAtPath(original, ["nested", "value"], 20);
    expect(next2).toBe(original);
  });

  it("setAtPath returns original object for empty path", () => {
    const original = { value: 10 };
    const next = setAtPath(original, [], 20);
    expect(next).toBe(original);
  });

  it("setAtPath handles numeric keys on objects", () => {
    const original = { "0": "a", "1": "b" };
    const next = setAtPath(original, ["0"], "c");
    expect(next).toEqual({ "0": "c", "1": "b" });
  });

  it("setAtPath handles deep no-op updates on arrays", () => {
    const original = [{ nested: { value: 1 } }];
    const next = setAtPath(original, ["0", "nested", "value"], 1);
    expect(next).toBe(original);
  });
});
