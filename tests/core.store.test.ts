import {
  createFormStore,
  parsePath,
  setAtPath,
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

  it("supports subscribe with selector stability", () => {
    const store = createFormStore();
    store.register("flag");

    const seen: boolean[] = [];
    const unsubscribe = store.subscribe((s) => s.getTouched("flag"), (value) => {
      seen.push(value);
    });

    store.markTouched("flag");
    store.markTouched("flag");

    expect(seen).toEqual([false, true]);

    unsubscribe();
  });

  it("passes the latest uncontrolled value into validators", () => {
    const values: unknown[] = [];
    const validator: Validator = (value) => {
      values.push(value);
      return { ok: value === "ok" };
    };

    const store = createFormStore();
    store.register("field", { initialValue: "", validate: validator });

    store.read(() => "ok");

    const result = store.validate("field");

    expect(result).toEqual({ ok: true });
    expect(values).toEqual(["ok"]);
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
});

describe("path helpers", () => {
  it("parses dotted and bracket notation", () => {
    const tokens = parsePath("rows[2].price");
    expect(tokens).toEqual(["rows", "2", "price"]);
  });

  it("gets and sets values without changing untouched branches", () => {
    const original = { rows: [{ price: 10 }, { price: 20 }] };
    const tokens = parsePath("rows[1].price");
    const next = setAtPath(original, tokens, (prev) => (Number(prev) ?? 0) + 5);

    expect(getAtPath(next, tokens)).toBe(25);
    expect(getAtPath(original, tokens)).toBe(20);
    expect(next.rows[0]).toBe(original.rows[0]);
  });
});
