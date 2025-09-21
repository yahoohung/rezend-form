import { createFormStore, parsePath, setAtPath, getAtPath } from "@form/core";

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
