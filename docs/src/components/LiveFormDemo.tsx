import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { createFormStore, type FormStore, type ValidationResult } from "@form/core";

const FIELD_PATH = "profile.name";
const INITIAL_VALUE = "Ada Lovelace";

interface DemoState {
  value: string;
  dirty: boolean;
  touched: boolean;
  error: string | null;
}

export function LiveFormDemo() {
  const store = useMemo<FormStore>(() => createFormStore(), []);
  const unregisterRef = useRef<(() => void) | null>(null);

  const [state, setState] = useState<DemoState>({
    value: INITIAL_VALUE,
    dirty: false,
    touched: false,
    error: null
  });

  const validator = useCallback((value: unknown): ValidationResult => {
    const stringValue = typeof value === "string" ? value.trim() : "";
    if (stringValue.length < 2) {
      return {
        ok: false,
        message: "Use at least two characters"
      };
    }
    return { ok: true };
  }, []);

  const syncStateFromStore = useCallback(() => {
    setState({
      value: (store.getValue(FIELD_PATH) as string) ?? INITIAL_VALUE,
      dirty: store.getDirty(FIELD_PATH),
      touched: store.getTouched(FIELD_PATH),
      error: store.getError(FIELD_PATH)
    });
  }, [store]);

  const registerField = useCallback(() => {
    unregisterRef.current?.();
    unregisterRef.current = store.register(FIELD_PATH, {
      mode: "controlled",
      initialValue: INITIAL_VALUE,
      validate: validator
    });
    syncStateFromStore();
    store.validate(FIELD_PATH);
  }, [store, validator, syncStateFromStore]);

  useEffect(() => {
    registerField();

    const unsubscribes = [
      store.subscribe((snapshot) => snapshot.getValue(FIELD_PATH), (value) => {
        setState((prev) => ({
          ...prev,
          value: typeof value === "string" ? value : ""
        }));
      }),
      store.subscribe((snapshot) => snapshot.getDirty(FIELD_PATH), (dirty) => {
        setState((prev) => ({
          ...prev,
          dirty: Boolean(dirty)
        }));
      }),
      store.subscribe((snapshot) => snapshot.getTouched(FIELD_PATH), (touched) => {
        setState((prev) => ({
          ...prev,
          touched: Boolean(touched)
        }));
      }),
      store.subscribe((snapshot) => snapshot.getError(FIELD_PATH), (error) => {
        setState((prev) => ({
          ...prev,
          error: typeof error === "string" && error.length > 0 ? error : null
        }));
      })
    ];

    return () => {
      unsubscribes.forEach((unsubscribe) => unsubscribe?.());
      unregisterRef.current?.();
      store.destroy();
    };
  }, [store, registerField]);

  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      store.setControlledValue(FIELD_PATH, event.target.value);
    },
    [store]
  );

  const handleFocus = useCallback(() => {
    store.markTouched(FIELD_PATH);
  }, [store]);

  const handleBlur = useCallback(() => {
    store.validate(FIELD_PATH);
  }, [store]);

  const handleReset = useCallback(() => {
    registerField();
  }, [registerField]);

  const handleServerPatch = useCallback(() => {
    store.setControlledValue(FIELD_PATH, "Grace Hopper");
    store.validate(FIELD_PATH);
  }, [store]);

  return (
    <div className="glass-panel relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.2),transparent_55%),radial-gradient(circle_at_bottom,_rgba(34,197,94,0.18),transparent_65%)] opacity-70" />
      <div className="relative flex flex-col gap-6 p-8">
        <header className="space-y-2">
          <p className="text-xs uppercase tracking-[0.4em] text-foreground/50">Live playground</p>
          <h3 className="text-2xl font-semibold text-foreground">Try Rezend Form without leaving the page</h3>
          <p className="text-sm text-foreground/70">
            Type into the field to see dirty / touched flags react instantly. Blur the input to run validation, or trigger
            a server patch to feel the controlled update pipeline.
          </p>
        </header>
        <label className="space-y-2 text-sm text-foreground/70">
          <span className="font-medium text-foreground/80">Full name</span>
          <input
            value={state.value}
            onChange={handleChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            placeholder="Start typing..."
            className="w-full rounded-[22px] border border-white/10 bg-white/10 px-4 py-3 text-base text-foreground shadow-inner shadow-black/20 transition focus:border-accent/60 focus:outline-none focus:ring-2 focus:ring-accent/40"
          />
          {state.error ? (
            <span className="text-xs font-medium text-rose-300/80">{state.error}</span>
          ) : (
            <span className="text-xs text-foreground/50">Blur to validate (minimum 2 characters)</span>
          )}
        </label>
        <div className="flex flex-wrap gap-2">
          <StatusPill label="Dirty" active={state.dirty} />
          <StatusPill label="Touched" active={state.touched} />
          <StatusPill label="Valid" active={!state.error} tone="emerald" />
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleReset}
            className="rounded-full border border-white/10 px-4 py-2 text-sm font-semibold text-foreground/70 transition hover:border-accent/50 hover:text-foreground"
          >
            Reset to initial value
          </button>
          <button
            type="button"
            onClick={handleServerPatch}
            className="rounded-full bg-gradient-to-r from-sky-400/80 to-emerald-400/80 px-4 py-2 text-sm font-semibold text-surface shadow-lg shadow-emerald-400/30 transition hover:shadow-emerald-300/50"
          >
            Simulate server patch
          </button>
        </div>
      </div>
    </div>
  );
}

interface StatusPillProps {
  label: string;
  active: boolean;
  tone?: "emerald" | "sky";
}

function StatusPill({ label, active, tone = "sky" }: StatusPillProps) {
  const palette = tone === "emerald"
    ? {
        activeBg: "bg-emerald-400/20",
        activeText: "text-emerald-200",
        inactiveBg: "bg-white/10",
        inactiveText: "text-foreground/40"
      }
    : {
        activeBg: "bg-sky-400/20",
        activeText: "text-sky-200",
        inactiveBg: "bg-white/10",
        inactiveText: "text-foreground/40"
      };

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-medium transition ${
        active ? `${palette.activeBg} ${palette.activeText}` : `${palette.inactiveBg} ${palette.inactiveText}`
      }`}
    >
      {label}
    </span>
  );
}
