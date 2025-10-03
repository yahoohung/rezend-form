import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FocusEvent,
  type MutableRefObject,
  type MouseEvent as ReactMouseEvent
} from "react";
import { createFormStore, type FormStore, type FieldPath } from "@form/core";
import { TopNav } from "../components/TopNav";
import { GradientCard } from "../components/GradientCard";

const TOTAL_ROWS = 60;
const TOTAL_COLS = 60;
const TOTAL_FIELDS = TOTAL_ROWS * TOTAL_COLS;
const SERVER_UPDATE_RATIO = 0.1;
const SERVER_UPDATE_COUNT = Math.floor(TOTAL_FIELDS * SERVER_UPDATE_RATIO);
const REGISTRATION_BATCH_SIZE = 600;
const RANDOM_SAMPLE_SIZE = 6;

const PINNED_FIELDS = [
  { label: "Top left", row: 0, col: 0 },
  { label: "Top right", row: 0, col: TOTAL_COLS - 1 },
  { label: "Center", row: Math.floor(TOTAL_ROWS / 2), col: Math.floor(TOTAL_COLS / 2) },
  { label: "Bottom left", row: TOTAL_ROWS - 1, col: 0 },
  { label: "Bottom right", row: TOTAL_ROWS - 1, col: TOTAL_COLS - 1 },
  { label: "Diagonal anchor", row: 42, col: 42 }
] as const;

const numberFormatter = new Intl.NumberFormat("en-US");

interface ServerStats {
  tick: number;
  applied: number;
  skippedTouched: number;
  skippedDirty: number;
  attempted: number;
}

const initialStats: ServerStats = {
  tick: 0,
  applied: 0,
  skippedTouched: 0,
  skippedDirty: 0,
  attempted: 0
};

interface PerformanceContextValue {
  store: FormStore;
  ready: boolean;
  baselineRef: MutableRefObject<Map<string, number>>;
  serverTickMapRef: MutableRefObject<Map<string, number>>;
  skippedTouchedRef: MutableRefObject<Set<string>>;
  skippedDirtyRef: MutableRefObject<Set<string>>;
  serverPulse: number;
  stats: ServerStats;
  touchedBitmapRef: MutableRefObject<Uint8Array>;
  dirtyBitmapRef: MutableRefObject<Uint8Array>;
  serverTickArrayRef: MutableRefObject<Uint32Array>;
  vizVersion: number;
  valueCacheRef: MutableRefObject<(string | number | null)[]>;
  pendingCellUpdatesRef: MutableRefObject<Set<number>>;
  fps: number;
  editingIndicesRef: MutableRefObject<Set<number>>;
  resolveIndex(path: FieldPath): number;
  beginUserEdit(index: number): void;
  finishUserEdit(index: number): void;
  queueCellUpdate(index: number): void;
  scheduleViz: () => void;
}

const PerformanceContext = createContext<PerformanceContextValue | null>(null);

function usePerformanceContext() {
  const ctx = useContext(PerformanceContext);
  if (!ctx) {
    throw new Error("usePerformanceContext must be used inside PerformanceContext provider");
  }
  return ctx;
}

const cellPath = (row: number, col: number) => `grid[${row}][${col}]`;
const initialValueFor = (row: number, col: number) => TOTAL_FIELDS - 1 - (row * TOTAL_COLS + col);
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const generateRandomIndices = (count: number = RANDOM_SAMPLE_SIZE) => {
  const selected = new Set<number>();
  while (selected.size < count) {
    selected.add(Math.floor(Math.random() * TOTAL_FIELDS));
  }
  return Array.from(selected);
};

const indexToCoordinates = (index: number) => {
  const row = Math.floor(index / TOTAL_COLS);
  const col = index % TOTAL_COLS;
  return { row, col };
};

const toInputValue = (value: unknown) => {
  if (value == null) {
    return "";
  }
  return typeof value === "string" ? value : String(value);
};

const scheduleIdle = (work: () => void) => {
  if (typeof window === "undefined") {
    return () => {
      // no-op on server
    };
  }

  if ("requestIdleCallback" in window) {
    const handle = (window as typeof window & { requestIdleCallback: (cb: IdleRequestCallback) => number }).requestIdleCallback(
      () => work()
    );
    return () => {
      if ("cancelIdleCallback" in window) {
        (window as typeof window & { cancelIdleCallback: (id: number) => void }).cancelIdleCallback(handle);
      }
    };
  }

  const timeout = window.setTimeout(work, 0);
  return () => window.clearTimeout(timeout);
};

export function PerformancePage() {
  return (
    <div className="performance-page">
      <TopNav />
      <main className="performance-main">
        <div className="performance-gradient performance-gradient--primary" aria-hidden />
        <div className="performance-gradient performance-gradient--secondary" aria-hidden />
        <section className="performance-shell">
          <header className="performance-hero">
            <p className="performance-eyebrow">Performance</p>
            <h1 className="performance-title">60 × 60 controlled fields under live server pressure</h1>
            <p className="performance-subtitle">
              This playground provisions 3,600 controlled fields and streams 360 server patches every second. Touch a cell, type a value,
              and watch Rezend Form keep background updates respectful while dirty tracking stays accurate.
            </p>
          </header>

          <PerformancePlayground />

          <div className="performance-pillars">
            <GradientCard
              title="Touched fields stay user-owned"
              description="markTouched flips a fast boolean. Server batches read it before every patch, so focused inputs never lose keystrokes."
            />
            <GradientCard
              title="Dirty means intentional diffs"
              description="Dirty flips only when the value diverges from its baseline; blur without edits keeps it false for confident server merges."
            />
            <GradientCard
              title="Reset restores baselines"
              description="Recreate the store in-place to wipe touched/dirty flags and roll values back to the initial 60 × 60 seed instantly."
            />
          </div>
        </section>
      </main>
      <footer className="performance-footer">
        <p>© {new Date().getFullYear()} Rezend Form</p>
      </footer>
    </div>
  );
}

function PerformancePlayground() {
  const baselineRef = useRef(new Map<string, number>());
  const serverTickMapRef = useRef(new Map<string, number>());
  const skippedTouchedRef = useRef<Set<string>>(new Set());
  const skippedDirtyRef = useRef<Set<string>>(new Set());
  const tickRef = useRef(1);
  const touchedBitmapRef = useRef(new Uint8Array(TOTAL_FIELDS));
  const dirtyBitmapRef = useRef(new Uint8Array(TOTAL_FIELDS));
  const serverTickArrayRef = useRef(new Uint32Array(TOTAL_FIELDS));
  const valueCacheRef = useRef<(string | number | null)[]>(new Array(TOTAL_FIELDS).fill(null));
  const pathIndexCacheRef = useRef(new Map<string, number>());
  const editingIndicesRef = useRef<Set<number>>(new Set());
  const pendingCellUpdatesRef = useRef<Set<number>>(new Set());
  const [vizVersion, setVizVersion] = useState(0);
  const vizFrameRef = useRef<number | null>(null);
  const fpsFrameRef = useRef<number | null>(null);
  const fpsLastSampleRef = useRef(typeof performance !== "undefined" ? performance.now() : 0);
  const fpsCounterRef = useRef(0);

  const queueCellUpdate = useCallback((index: number) => {
    pendingCellUpdatesRef.current.add(index);
  }, []);

  const scheduleViz = useCallback(() => {
    if (vizFrameRef.current != null) {
      return;
    }
    vizFrameRef.current = requestAnimationFrame(() => {
      vizFrameRef.current = null;
      setVizVersion((version) => version + 1);
    });
  }, []);

  const indexFromPath = useCallback(
    (path: string) => {
      const cached = pathIndexCacheRef.current.get(path);
      if (cached !== undefined) {
        return cached;
      }
      const match = path.match(/^grid\[(\d+)]\[(\d+)]$/);
      if (!match) {
        return -1;
      }
      const row = Number(match[1]);
      const col = Number(match[2]);
      const index = row * TOTAL_COLS + col;
      pathIndexCacheRef.current.set(path, index);
      return index;
    },
    []
  );

  const startUserEdit = useCallback((index: number) => {
    editingIndicesRef.current.add(index);
  }, []);

  const finishUserEdit = useCallback((index: number) => {
    editingIndicesRef.current.delete(index);
  }, []);

  const trackingPlugin = useMemo(() => {
    return {
      name: "performance-field-tracker",
      setup(ctx) {
        const offCommit = ctx.on("commit", (event) => {
          const commit = event as CommitEvent;
          const { path, type, payload } = commit;
          if (!path || !path.startsWith("grid[")) {
            return undefined;
          }

          const index = indexFromPath(path);
          if (index < 0 || index >= TOTAL_FIELDS) {
            return undefined;
          }

          if (type === "register") {
            // Do not reset touched state on register, as server patches use this.
            // touchedBitmapRef.current[index] = 0;
            dirtyBitmapRef.current[index] = 0;
            const initial = (payload as { initialValue?: unknown } | undefined)?.initialValue;
            if (typeof initial === "number" || typeof initial === "string") {
              valueCacheRef.current[index] = initial;
            } else if (initial == null) {
              valueCacheRef.current[index] = null;
            } else {
              valueCacheRef.current[index] = String(initial);
            }
            queueCellUpdate(index);
            scheduleViz();
            return undefined;
          }

          if (type === "markTouched") {
            if (touchedBitmapRef.current[index] === 0) {
              touchedBitmapRef.current[index] = 1;
              queueCellUpdate(index);
              scheduleViz();
            }
            return undefined;
          }

          if (type === "markDirty") {
            if (dirtyBitmapRef.current[index] === 0) {
              dirtyBitmapRef.current[index] = 1;
              queueCellUpdate(index);
              scheduleViz();
            }
            return undefined;
          }

          if (type === "setControlledValue") {
            const baseline = baselineRef.current.get(path);
            const nextValue = payload;
            const isDirty = baseline === undefined ? true : !Object.is(nextValue, baseline);
            const current = dirtyBitmapRef.current[index] === 1;
            if (isDirty && !current) {
              dirtyBitmapRef.current[index] = 1;
              queueCellUpdate(index);
              scheduleViz();
            } else if (!isDirty && current) {
              dirtyBitmapRef.current[index] = 0;
              queueCellUpdate(index);
              scheduleViz();
            }
            if (typeof nextValue === "number" || typeof nextValue === "string") {
              valueCacheRef.current[index] = nextValue;
            } else if (nextValue == null) {
              valueCacheRef.current[index] = null;
            } else if (baseline !== undefined) {
              valueCacheRef.current[index] = baseline;
            } else {
              valueCacheRef.current[index] = String(nextValue);
            }
            queueCellUpdate(index);
            scheduleViz();
            return undefined;
          }
          return undefined;
        });

        return () => {
          offCommit();
        };
      }
    } as const;
  }, [baselineRef, dirtyBitmapRef, indexFromPath, queueCellUpdate, scheduleViz, touchedBitmapRef, valueCacheRef]);

  const [store, setStore] = useState<FormStore>(() => createFormStore({ plugins: [trackingPlugin] }));
  const [ready, setReady] = useState(false);
  const [registeredCount, setRegisteredCount] = useState(0);
  const [autoPatch, setAutoPatch] = useState(true);
  const [serverPulse, setServerPulse] = useState(0);
  const [stats, setStats] = useState<ServerStats>(initialStats);
  const [fps, setFps] = useState(0);

  useEffect(() => () => store.destroy(), [store]);

  useEffect(() => {
    const sample = (now: number) => {
      fpsCounterRef.current += 1;
      const elapsed = now - fpsLastSampleRef.current;
      if (elapsed >= 1000) {
        const nextFps = (fpsCounterRef.current / elapsed) * 1000;
        setFps(nextFps);
        fpsCounterRef.current = 0;
        fpsLastSampleRef.current = now;
      }
      fpsFrameRef.current = requestAnimationFrame(sample);
    };

    fpsFrameRef.current = requestAnimationFrame(sample);

    return () => {
      if (fpsFrameRef.current != null) {
        cancelAnimationFrame(fpsFrameRef.current);
        fpsFrameRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setReady(false);
    setStats(initialStats);
    setRegisteredCount(0);
    baselineRef.current.clear();
    serverTickMapRef.current.clear();
    skippedTouchedRef.current = new Set();
    skippedDirtyRef.current = new Set();
    tickRef.current = 1;
    touchedBitmapRef.current.fill(0);
    dirtyBitmapRef.current.fill(0);
    serverTickArrayRef.current.fill(0);
    pathIndexCacheRef.current.clear();
    valueCacheRef.current.fill(null);
    editingIndicesRef.current.clear();
    scheduleViz();

    const total = TOTAL_FIELDS;
    let index = 0;
    let cancelNext: (() => void) | undefined;

    const runBatch = () => {
      if (cancelled) {
        return;
      }

      let processed = 0;
      let batchChanged = false;
      while (index < total && processed < REGISTRATION_BATCH_SIZE) {
        const row = Math.floor(index / TOTAL_COLS);
        const col = index % TOTAL_COLS;
        const path = cellPath(row, col);
        const initialValue = initialValueFor(row, col);
        store.register(path, { mode: "controlled", initialValue });
        baselineRef.current.set(path, initialValue);
        valueCacheRef.current[index] = initialValue;
        queueCellUpdate(index);
        batchChanged = true;
        index += 1;
        processed += 1;
      }

      if (batchChanged) {
        scheduleViz();
      }

      if (!cancelled) {
        setRegisteredCount(index);
      }

      if (index < total) {
        cancelNext = scheduleIdle(runBatch);
      } else if (!cancelled) {
        setReady(true);
      }
    };

    runBatch();

    return () => {
      cancelled = true;
      if (cancelNext) {
        cancelNext();
      }
    };
  }, [queueCellUpdate, scheduleViz, store]);

  useEffect(() => {
    if (!ready) {
      return;
    }

    if (!autoPatch) {
      skippedTouchedRef.current = new Set();
      skippedDirtyRef.current = new Set();
      setServerPulse((prev) => prev + 1);
      scheduleViz();
      return;
    }

    let cancelled = false;

    const interval = window.setInterval(() => {
      if (cancelled) {
        return;
      }

      const total = TOTAL_FIELDS;
      const target = SERVER_UPDATE_COUNT;
      let applied = 0;
      let skippedTouched = 0;
      let skippedDirty = 0;
      let attempts = 0;

      const touchedSkippedSet = new Set<string>();
      const dirtySkippedSet = new Set<string>();
      const visited = new Set<number>();
      const maxAttempts = Math.min(total * 2, total + target * 4);

      while (applied < target && attempts < maxAttempts) {
        let index = Math.floor(Math.random() * total);
        while (visited.has(index) && visited.size < total) {
          index = Math.floor(Math.random() * total);
        }
        visited.add(index);
        attempts += 1;

        const row = Math.floor(index / TOTAL_COLS);
        const col = index % TOTAL_COLS;
        const path = cellPath(row, col);

        if (editingIndicesRef.current.has(index)) {
          skippedTouched += 1;
          touchedSkippedSet.add(path);
          continue;
        }

        if (touchedBitmapRef.current[index] === 1) {
          skippedTouched += 1;
          touchedSkippedSet.add(path);
          continue;
        }

        if (store.getDirty(path)) {
          skippedDirty += 1;
          dirtySkippedSet.add(path);
          continue;
        }

        const nextValue = Math.floor(Math.random() * 10000);
        baselineRef.current.set(path, nextValue);
        serverTickMapRef.current.set(path, tickRef.current);
        serverTickArrayRef.current[index] = tickRef.current;
        valueCacheRef.current[index] = nextValue;
        queueCellUpdate(index);
        scheduleViz();
        store.setControlledValue(path, nextValue);
        store.register(path, { mode: "controlled", initialValue: nextValue });
        applied += 1;
      }

      skippedTouchedRef.current = touchedSkippedSet;
      skippedDirtyRef.current = dirtySkippedSet;

      setStats({
        tick: tickRef.current,
        applied,
        skippedTouched,
        skippedDirty,
        attempted: attempts
      });
      setServerPulse((prev) => prev + 1);
      scheduleViz();
      tickRef.current += 1;
    }, 1000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [autoPatch, baselineRef, queueCellUpdate, ready, scheduleViz, serverTickArrayRef, serverTickMapRef, skippedDirtyRef, skippedTouchedRef, store, touchedBitmapRef]);

  const handleToggleAuto = useCallback(() => {
    setAutoPatch((prev) => !prev);
  }, []);

  const handleReset = useCallback(() => {
    setAutoPatch(true);
    setStats(initialStats);
    setRegisteredCount(0);
    setReady(false);
    baselineRef.current.clear();
    serverTickMapRef.current.clear();
    skippedTouchedRef.current = new Set();
    skippedDirtyRef.current = new Set();
    tickRef.current = 1;
    touchedBitmapRef.current.fill(0);
    dirtyBitmapRef.current.fill(0);
    serverTickArrayRef.current.fill(0);
    pathIndexCacheRef.current.clear();
    valueCacheRef.current.fill(null);
    editingIndicesRef.current.clear();
    pendingCellUpdatesRef.current.clear();
    for (let i = 0; i < TOTAL_FIELDS; i += 1) {
      pendingCellUpdatesRef.current.add(i);
    }
    setServerPulse((prev) => prev + 1);
    scheduleViz();

    setStore((previous) => {
      previous.destroy();
      return createFormStore({ plugins: [trackingPlugin] });
    });
  }, [baselineRef, dirtyBitmapRef, pathIndexCacheRef, scheduleViz, serverTickArrayRef, serverTickMapRef, skippedDirtyRef, skippedTouchedRef, trackingPlugin, touchedBitmapRef, valueCacheRef]);

  const progressPercent = Math.min(100, Math.round((registeredCount / TOTAL_FIELDS) * 100));
  const contextValue = useMemo(
    () => ({
      store,
      ready,
      baselineRef,
      serverTickMapRef,
      skippedTouchedRef,
      skippedDirtyRef,
      serverPulse,
      stats,
      touchedBitmapRef,
      dirtyBitmapRef,
      serverTickArrayRef,
      vizVersion,
      valueCacheRef,
      pendingCellUpdatesRef,
      scheduleViz,
      fps,
      editingIndicesRef,
      resolveIndex: indexFromPath,
      beginUserEdit: startUserEdit,
      finishUserEdit,
      queueCellUpdate
    }),
    [baselineRef, dirtyBitmapRef, editingIndicesRef, finishUserEdit, fps, indexFromPath, pendingCellUpdatesRef, queueCellUpdate, ready, scheduleViz, serverPulse, serverTickArrayRef, serverTickMapRef, skippedDirtyRef, skippedTouchedRef, startUserEdit, stats, store, touchedBitmapRef, valueCacheRef, vizVersion]
  );

  return (
    <PerformanceContext.Provider value={contextValue}>
      <div className="performance-panel">
        <div className="performance-panel-body">
          <div className="performance-summary">
            <div className="performance-summary-copy">
              <h2 className="performance-summary-title">High-density playground</h2>
              <p className="performance-summary-subtitle">
                Rezend Form keeps 3,600 controlled cells reactive without blowing through renders. 360 untouched cells accept new
                baselines every second; touched or dirty paths stay frozen for the user.
              </p>
            </div>
            <div className="performance-controls">
              <button
                type="button"
                onClick={handleToggleAuto}
                disabled={!ready}
                className={`performance-button ${
                  autoPatch ? "performance-button--outline" : "performance-button--accent"
                }${!ready ? " performance-button--disabled" : ""}`}
              >
                {autoPatch ? "Pause server patches" : "Resume server patches"}
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="performance-button performance-button--ghost"
              >
                Reset grid
              </button>
            </div>
          </div>

          <div className="performance-metrics">
            <MetricTile
              label="Fields registered"
              value={`${numberFormatter.format(registeredCount)} / ${numberFormatter.format(TOTAL_FIELDS)}`}
              helper={ready ? "All cells registered" : `Registering… ${progressPercent}%`}
            />
            <MetricTile
              label="Server batch size"
              value={numberFormatter.format(SERVER_UPDATE_COUNT)}
              helper="10% of the grid per second"
            />
            <MetricTile
              label="Applied last tick"
              value={numberFormatter.format(stats.applied)}
              helper={stats.tick === 0 ? "Waiting for first tick" : `Attempts: ${numberFormatter.format(stats.attempted)}`}
            />
            <MetricTile
              label="Skipped last tick"
              value={numberFormatter.format(stats.skippedTouched + stats.skippedDirty)}
              helper={`Touched: ${numberFormatter.format(stats.skippedTouched)} · Dirty: ${numberFormatter.format(stats.skippedDirty)}`}
            />
          </div>

          {!ready && (
            <div className="performance-progress" aria-hidden>
              <div className="performance-progress-bar" style={{ width: `${progressPercent}%` }} />
            </div>
          )}

          <div className="performance-section">
            <div>
              <p className="performance-section-eyebrow">Full input grid</p>
              <p className="performance-section-copy">
                The 60 × 60 matrix below renders every controlled input at 1× scale. Scroll the container to explore; hovering any cell
                pins a zoomed preview for quick inspection.
              </p>
            </div>
            <GridMiniature />
          </div>

          <div className="performance-section">
            <p className="performance-section-eyebrow">Pinned cells</p>
            <p className="performance-section-copy">
              Pick any coordinates (1-indexed). Dirty or touched inputs will resist server writes until you clear them; untouched
              cells accept the next baseline immediately.
            </p>
          </div>

          <div className="performance-field-grid">
            {PINNED_FIELDS.map((field) => (
              <FieldPreview key={field.label} label={field.label} defaultRow={field.row} defaultCol={field.col} />
            ))}
          </div>

          <RandomFieldShowcase />
        </div>
      </div>
    </PerformanceContext.Provider>
  );
}

interface FieldPreviewProps {
  label: string;
  defaultRow: number;
  defaultCol: number;
}

function FieldPreview({ label, defaultRow, defaultCol }: FieldPreviewProps) {
  const {
    store,
    ready,
    baselineRef,
    serverTickMapRef,
    skippedTouchedRef,
    skippedDirtyRef,
    serverPulse,
    stats,
    resolveIndex,
    beginUserEdit,
    finishUserEdit
  } = usePerformanceContext();

  const [rowInput, setRowInput] = useState(defaultRow + 1);
  const [colInput, setColInput] = useState(defaultCol + 1);

  useEffect(() => {
    setRowInput(defaultRow + 1);
    setColInput(defaultCol + 1);
  }, [defaultRow, defaultCol]);

  const rowIndex = rowInput - 1;
  const colIndex = colInput - 1;
  const path = useMemo(() => cellPath(rowIndex, colIndex), [rowIndex, colIndex]);
  const gridIndex = useMemo(() => resolveIndex(path), [resolveIndex, path]);
  const previousIndexRef = useRef(gridIndex);
  useEffect(() => {
    const previous = previousIndexRef.current;
    if (previous !== gridIndex && previous >= 0) {
      finishUserEdit(previous);
    }
    previousIndexRef.current = gridIndex;
    return () => {
      if (gridIndex >= 0) {
        finishUserEdit(gridIndex);
      }
    };
  }, [finishUserEdit, gridIndex]);

  const [value, setValue] = useState(() => toInputValue(store.getValue(path)));
  const [touched, setTouched] = useState(() => store.getTouched(path));
  const [dirty, setDirty] = useState(() => store.getDirty(path));
  const [skipState, setSkipState] = useState({ touched: false, dirty: false });
  const [lastServerTick, setLastServerTick] = useState<number | null>(() => {
    const tick = serverTickMapRef.current.get(path);
    return tick ?? null;
  });

  useEffect(() => {
    setValue(toInputValue(store.getValue(path)));
    setTouched(store.getTouched(path));
    setDirty(store.getDirty(path));
    setSkipState({ touched: false, dirty: false });
    const tick = serverTickMapRef.current.get(path);
    setLastServerTick(tick ?? null);
  }, [store, path, serverTickMapRef]);

  useEffect(() => {
    const unsubscribe = store.subscribe(
      (snapshot) => ({
        value: snapshot.getValue(path),
        touched: snapshot.getTouched(path),
        dirty: snapshot.getDirty(path)
      }),
      (next) => {
        setValue(toInputValue(next.value));
        setTouched(Boolean(next.touched));
        setDirty(Boolean(next.dirty));
        const tick = serverTickMapRef.current.get(path) ?? null;
        setLastServerTick(tick);
      }
    );
    return unsubscribe;
  }, [store, path, serverTickMapRef]);

  useEffect(() => {
    const touchedSkipped = skippedTouchedRef.current.has(path);
    const dirtySkipped = skippedDirtyRef.current.has(path);
    setSkipState({ touched: touchedSkipped, dirty: dirtySkipped });
  }, [serverPulse, path, skippedTouchedRef, skippedDirtyRef]);

  const handleRowChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const numeric = Number(event.target.value);
    if (Number.isNaN(numeric)) {
      return;
    }
    setRowInput(clamp(Math.round(numeric), 1, TOTAL_ROWS));
  }, []);

  const handleColChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const numeric = Number(event.target.value);
    if (Number.isNaN(numeric)) {
      return;
    }
    setColInput(clamp(Math.round(numeric), 1, TOTAL_COLS));
  }, []);

  const handleFocus = useCallback(() => {
    store.markTouched(path);
    if (gridIndex >= 0) {
      beginUserEdit(gridIndex);
    }
  }, [beginUserEdit, gridIndex, store, path]);

  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const next = event.target.value;
      setValue(next);
      store.setControlledValue(path, next);
    },
    [store, path]
  );

  const handleBlur = useCallback(() => {
    const stillDirty = store.getDirty(path);
    if (!stillDirty && gridIndex >= 0) {
      finishUserEdit(gridIndex);
    }
  }, [finishUserEdit, gridIndex, store, path]);

  const handleFieldReset = useCallback(() => {
    const baseline = baselineRef.current.get(path);
    if (baseline === undefined) {
      return;
    }
    store.register(path, { mode: "controlled", initialValue: baseline });
    store.setControlledValue(path, baseline);
    if (gridIndex >= 0) {
      finishUserEdit(gridIndex);
    }
  }, [baselineRef, finishUserEdit, gridIndex, store, path]);

  const baseline = baselineRef.current.get(path);
  const ticksSincePatch = lastServerTick != null ? Math.max(0, stats.tick - lastServerTick) : null;

  let statusMessage = "Registering…";
  if (ready) {
    if (skipState.touched) {
      statusMessage = "Skipped: field is touched";
    } else if (skipState.dirty) {
      statusMessage = "Skipped: waiting on dirty value";
    } else if (lastServerTick != null) {
      statusMessage = ticksSincePatch === 0 ? "Patched this second" : `Last server patch: tick ${lastServerTick}`;
    } else {
      statusMessage = "Waiting for first server patch";
    }
  }

  return (
    <div className="performance-field-card">
      <div className="performance-field-header">
        <div>
          <p className="performance-card-eyebrow">{label}</p>
          <p className="performance-card-path">{path}</p>
        </div>
        <div className="performance-field-coords">
          <label className="performance-field-control">
            <span>Row</span>
            <input
              type="number"
              min={1}
              max={TOTAL_ROWS}
              value={rowInput}
              onChange={handleRowChange}
              className="performance-field-number"
            />
          </label>
          <label className="performance-field-control">
            <span>Col</span>
            <input
              type="number"
              min={1}
              max={TOTAL_COLS}
              value={colInput}
              onChange={handleColChange}
              className="performance-field-number"
            />
          </label>
        </div>
      </div>

      <input
        value={value}
        onFocus={handleFocus}
        onChange={handleChange}
        onBlur={handleBlur}
        disabled={!ready}
        className="performance-field-input"
        placeholder={ready ? "Type to override server patches" : "Registering fields…"}
      />

      <div className="performance-badge-row">
        <StatusBadge label="Touched" active={touched} />
        <StatusBadge label="Dirty" active={dirty} tone="emerald" />
        <StatusBadge label="Server skipped" active={skipState.touched || skipState.dirty} tone="rose" />
      </div>

      <p className="performance-field-status">{statusMessage}</p>

      <div className="performance-field-meta">
        <span>Baseline: {baseline !== undefined ? baseline : "—"}</span>
        <button type="button" onClick={handleFieldReset} className="performance-field-reset">
          Reset field
        </button>
      </div>

      {lastServerTick != null && (
        <p className="performance-field-note">
          {ticksSincePatch === 0 ? "Aligned with latest server batch." : `${ticksSincePatch} tick${ticksSincePatch === 1 ? "" : "s"} since last server patch.`}
        </p>
      )}
    </div>
  );
}

function GridMiniature() {
  const {
    ready,
    vizVersion,
    valueCacheRef,
    touchedBitmapRef,
    dirtyBitmapRef,
    baselineRef,
    pendingCellUpdatesRef,
    queueCellUpdate,
    fps,
    store,
    beginUserEdit,
    finishUserEdit,
    editingIndicesRef
  } = usePerformanceContext();
  const miniatureRef = useRef<HTMLDivElement | null>(null);
  const cellRefs = useRef<(HTMLInputElement | null)[]>(new Array(TOTAL_FIELDS).fill(null));
  const previousValuesRef = useRef<string[]>(new Array(TOTAL_FIELDS).fill(""));
  const [inView, setInView] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const cells = useMemo(() => {
    return Array.from({ length: TOTAL_FIELDS }, (_unused, index) => {
      const row = Math.floor(index / TOTAL_COLS) + 1;
      const col = (index % TOTAL_COLS) + 1;
      return (
        <input
          key={index}
          ref={(element) => {
            cellRefs.current[index] = element;
          }}
          data-index={index}
          data-row={row}
          data-col={col}
          tabIndex={-1}
          defaultValue=""
          className="grid-miniature-input"
          aria-label={`Row ${row} column ${col}`}
        />
      );
    });
  }, []);

  const syncCells = useCallback(() => {
    const pending = pendingCellUpdatesRef.current;
    if (pending.size === 0) {
      return;
    }
    const cells = cellRefs.current;
    const previousValues = previousValuesRef.current;
    const values = valueCacheRef.current;
    const touched = touchedBitmapRef.current;
    const dirty = dirtyBitmapRef.current;

    const indices = Array.from(pending);
    pending.clear();

    for (const index of indices) {
      const cell = cells[index];
      if (!cell) {
        continue;
      }

      const raw = values[index];
      const nextValue = raw == null ? "" : typeof raw === "string" ? raw : String(raw);
      if (previousValues[index] !== nextValue) {
        cell.value = nextValue;
        previousValues[index] = nextValue;
      }

      const isTouched = touched[index] === 1;
      if (isTouched) {
        cell.classList.add("grid-miniature-input--touched");
      } else {
        cell.classList.remove("grid-miniature-input--touched");
      }

      const isDirty = dirty[index] === 1;
      if (isDirty) {
        cell.classList.add("grid-miniature-input--dirty");
      } else {
        cell.classList.remove("grid-miniature-input--dirty");
        if (
          editingIndicesRef.current.has(index) &&
          (typeof document === "undefined" || cell !== (document.activeElement as HTMLInputElement | null))
        ) {
          finishUserEdit(index);
        }
      }
    }
  }, [dirtyBitmapRef, editingIndicesRef, finishUserEdit, pendingCellUpdatesRef, touchedBitmapRef, valueCacheRef]);

  useEffect(() => {
    syncCells();
  }, [syncCells]);

  useEffect(() => {
    syncCells();
  }, [syncCells, vizVersion]);

  const handleMouseMove = useCallback(
    (event: ReactMouseEvent<HTMLDivElement>) => {
      const target = event.target as HTMLElement | null;
      if (!target || !target.hasAttribute("data-index")) {
        setHoveredIndex(null);
        return;
      }
      const index = Number(target.getAttribute("data-index"));
      if (Number.isNaN(index)) {
        setHoveredIndex(null);
        return;
      }
      setHoveredIndex(index);
    },
    []
  );

  const handleMouseLeave = useCallback(() => {
    setHoveredIndex(null);
  }, []);

  const pathFromIndex = useCallback((index: number) => {
    const row = Math.floor(index / TOTAL_COLS);
    const col = index % TOTAL_COLS;
    return cellPath(row, col);
  }, []);

  const handleFocus = useCallback(
    (event: FocusEvent<HTMLInputElement>) => {
      if (!ready) {
        return;
      }
      const target = event.target;
      if (!target.dataset.index) {
        return;
      }
      const index = Number(target.dataset.index);
      if (Number.isNaN(index)) {
        return;
      }
      beginUserEdit(index);
      const path = pathFromIndex(index);
      store.markTouched(path);
    },
    [beginUserEdit, pathFromIndex, ready, store]
  );

  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      if (!ready) {
        return;
      }
      const target = event.target;
      if (!target.dataset.index) {
        return;
      }
      const index = Number(target.dataset.index);
      if (Number.isNaN(index)) {
        return;
      }
      const raw = target.value;
      const trimmed = raw.trim();
      let nextValue: string | number = raw;
      if (trimmed === "") {
        nextValue = "";
      } else {
        const numeric = Number(raw);
        if (!Number.isNaN(numeric)) {
          nextValue = numeric;
        }
      }
      const path = pathFromIndex(index);
      store.setControlledValue(path, nextValue);
    },
    [pathFromIndex, ready, store]
  );

  const handleBlur = useCallback(
    (event: FocusEvent<HTMLInputElement>) => {
      if (!ready) {
        return;
      }
      const target = event.target;
      if (!target.dataset.index) {
        return;
      }
      const index = Number(target.dataset.index);
      if (Number.isNaN(index)) {
        return;
      }
      finishUserEdit(index);
    },
    [finishUserEdit, ready]
  );

  const handleResetClick = useCallback(
    (event: ReactMouseEvent<HTMLButtonElement>) => {
      const { index: indexAttr } = event.currentTarget.dataset;
      if (indexAttr == null) {
        return;
      }
      const index = Number(indexAttr);
      if (Number.isNaN(index)) {
        return;
      }
      const path = pathFromIndex(index);
      const baseline = baselineRef.current.get(path);
      const fallback = valueCacheRef.current[index];
      const target = baseline ?? (fallback ?? "");
      store.setControlledValue(path, target);
      finishUserEdit(index);
      const cell = cellRefs.current[index];
      if (cell) {
        const next = typeof target === "string" ? target : String(target);
        cell.value = typeof next === "string" ? next : String(next);
      }
      previousValuesRef.current[index] = typeof target === "string" ? target : String(target ?? "");
      queueCellUpdate(index);
    },
    [baselineRef, finishUserEdit, pathFromIndex, queueCellUpdate, store, valueCacheRef]
  );

  useEffect(() => {
    const node = miniatureRef.current;
    if (!node) {
      return undefined;
    }
    if (typeof window === "undefined" || !("IntersectionObserver" in window)) {
      setInView(true);
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.target === node) {
            setInView(entry.isIntersecting);
          }
        }
      },
      { threshold: 0.25 }
    );

    observer.observe(node);

    return () => observer.disconnect();
  }, []);

  const showFps = ready && inView && fps > 0;
  const hoveredDetails = useMemo(() => {
    if (hoveredIndex == null) {
      return null;
    }
    const index = hoveredIndex;
    const values = valueCacheRef.current;
    const value = values[index];
    const row = Math.floor(index / TOTAL_COLS) + 1;
    const col = (index % TOTAL_COLS) + 1;
    const formatted = toInputValue(value);
    return {
      index,
      row,
      col,
      value: formatted
    };
  }, [hoveredIndex, valueCacheRef, vizVersion]);

  return (
    <div ref={miniatureRef} className="grid-miniature">
      {!ready && <div className="grid-miniature-overlay">Registering 3,600 inputs…</div>}
      <div className="grid-miniature-scale">
        <div
          className="grid-miniature-grid"
          onFocus={handleFocus}
          onChange={handleChange}
          onBlur={handleBlur}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          {cells}
        </div>
      </div>
      {hoveredDetails && (
        <button
          type="button"
          data-index={hoveredDetails.index}
          onClick={handleResetClick}
          className="grid-miniature-reset"
          disabled={!ready}
        >
          Reset R{hoveredDetails.row}C{hoveredDetails.col}
        </button>
      )}
      {showFps && (
        <div className="grid-miniature-fps" aria-live="polite">
          <span className="grid-miniature-fps-value">{Math.max(0, Math.round(fps))}</span>
          <span className="grid-miniature-fps-label">fps</span>
        </div>
      )}
      {hoveredDetails && (
        <div className="grid-miniature-preview">
          <p className="grid-miniature-preview-meta">
            Row {hoveredDetails.row} • Col {hoveredDetails.col}
          </p>
          <input readOnly value={hoveredDetails.value} className="grid-miniature-preview-input" />
        </div>
      )}
    </div>
  );
}

function RandomFieldShowcase() {
  const { ready } = usePerformanceContext();
  const [samples, setSamples] = useState<number[]>(() => generateRandomIndices());

  useEffect(() => {
    if (ready) {
      setSamples(generateRandomIndices());
    }
  }, [ready]);

  const shuffle = useCallback(() => {
    setSamples(generateRandomIndices());
  }, []);

  return (
    <div className="performance-random">
      <div className="performance-random-header">
        <div>
          <p className="performance-section-eyebrow">Random sampler</p>
          <p className="performance-section-copy">
            Shuffle six grid coordinates to poke around. Each tile is live, so type to mark dirty or blur to reset touched state.
          </p>
        </div>
        <button type="button" onClick={shuffle} className="performance-button performance-button--ghost">
          Shuffle selection
        </button>
      </div>
      <div className="performance-field-grid">
        {samples.map((index, idx) => {
          const { row, col } = indexToCoordinates(index);
          return (
            <FieldPreview
              key={`${index}-${idx}`}
              label={`Sample ${idx + 1} — R${row + 1}C${col + 1}`}
              defaultRow={row}
              defaultCol={col}
            />
          );
        })}
      </div>
    </div>
  );
}

interface StatusBadgeProps {
  label: string;
  active: boolean;
  tone?: "sky" | "emerald" | "rose";
}

function StatusBadge({ label, active, tone = "sky" }: StatusBadgeProps) {
  const activeTone = {
    sky: "performance-badge--sky",
    emerald: "performance-badge--emerald",
    rose: "performance-badge--rose"
  } as const;

  return <span className={`performance-badge ${active ? activeTone[tone] : "performance-badge--inactive"}`}>{label}</span>;
}

interface MetricTileProps {
  label: string;
  value: string;
  helper?: string;
}

function MetricTile({ label, value, helper }: MetricTileProps) {
  return (
    <div className="performance-metric">
      <p className="performance-metric-label">{label}</p>
      <p className="performance-metric-value">{value}</p>
      {helper && <p className="performance-metric-helper">{helper}</p>}
    </div>
  );
}
