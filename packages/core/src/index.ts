/**
 * @packageDocumentation
 * Plain JavaScript form store with strong TypeScript support.
 * The implementation follows simple UK English descriptions and keeps the code explicit.
 */

/** Maximum items stored in the path parse cache. */
const PATH_CACHE_LIMIT = 500;

const pathCache = new Map<string, readonly string[]>();

/**
 * A dotted or bracket style path string used to address form fields.
 */
export type FieldPath = string;

/**
 * Result returned by any validator function.
 */
export interface ValidationResult {
  /** True when the field or form passes validation. */
  ok: boolean;
  /** Optional message for the first or most important error. */
  message?: string;
}

/**
 * Validator signature covering both sync and async flows.
 */
export type Validator = (
  value: unknown,
  path: FieldPath,
  snapshot: Snapshot
) => ValidationResult | Promise<ValidationResult>;

/**
 * Read-only snapshot used by selectors and read operations.
 */
export interface Snapshot {
  /** Returns whether the given path has been touched by the user. */
  getTouched(path: FieldPath): boolean;
  /** Returns whether the given path is dirty compared with the initial value. */
  getDirty(path: FieldPath): boolean;
  /** Returns the current validation error message for the path, if any. */
  getError(path: FieldPath): string | null;
}

/** Options accepted when registering a field path. */
export interface RegisterOptions {
  /** Choose input mode. Default is 'uncontrolled'. */
  mode?: "uncontrolled" | "controlled";
  /** Optional field validator. */
  validate?: Validator;
  /** Optional initial value used for dirty checks. */
  initialValue?: unknown;
  /** Optional developer metadata. */
  meta?: unknown;
}

/**
 * Mutation context passed through middleware.
 */
export interface MutCtx {
  /** Action type name, e.g. 'register', 'markDirty'. */
  type: string;
  /** Path affected by this mutation, if any. */
  path: FieldPath | undefined;
  /** Arbitrary payload for the action. */
  payload?: unknown;
  /** Monotonic number to order events and allow simple cancellation. */
  epoch: number;
  /** Cached timestamp to avoid repeated Date.now() calls. */
  now: number;
}

/** Next function used when composing middleware. */
export type Next = (ctx: MutCtx) => void;

/** Middleware with low overhead. */
export type Middleware = (next: Next) => Next;

/**
 * Plugin context wiring the store with external helpers.
 */
export interface PluginContext {
  /** Subscribe to Store lifecycle events. */
  on(event: "register" | "unregister" | "validate" | "commit", cb: (e: unknown) => () => void): () => void;
  /** Register a middleware with the Store. */
  addMiddleware(mw: Middleware): void;
  /** Attach a validator to a specific path. */
  addValidator(path: FieldPath, v: Validator): () => void;
  /** Access the Store’s path parser. */
  parsePath(path: FieldPath): readonly string[];
  /** Subscribe using the same rules as the Store. */
  subscribe: FormStore["subscribe"];
}

/** Plugin surface kept small and explicit. */
export interface Plugin {
  /** Short name for logs and DevTools. */
  name: string;
  /** Install the plugin. Return a cleanup to remove it. */
  setup(ctx: PluginContext): void | (() => void);
}

/** Options used when creating a store instance. */
export interface CreateStoreOptions {
  /** Optional middleware array. Keep it small; each should be O(1). */
  middleware?: Middleware[];
  /** Optional plugins. Nothing is implicit; all are opt-in. */
  plugins?: Plugin[];
  /** Optional validation adapter hint for docs/examples. */
  validateAdapter?: "zod" | "yup" | "custom";
}

/**
 * High cohesion form store interface.
 */
export interface FormStore {
  /**
   * Register a field path with optional options.
   * Returns a function that unregisters the field.
   */
  register(path: FieldPath, opts?: RegisterOptions): () => void;

  /** Mark a field as touched. Call this on first user interaction or blur. */
  markTouched(path: FieldPath): void;

  /** Mark a field as dirty. Call this when input changes. */
  markDirty(path: FieldPath): void;

  /**
   * Set the current value for a controlled field.
   * This updates dirty state by comparing with the initial value.
   */
  setControlledValue(path: FieldPath, value: unknown): void;

  /**
   * Validate a single field or the whole form.
   * Returns a result or a Promise for async validation.
   */
  validate(path?: FieldPath): ValidationResult | Promise<ValidationResult>;

  /** Getters for flags and errors (cheap and path-scoped). */
  getTouched(path: FieldPath): boolean;
  getDirty(path: FieldPath): boolean;
  getError(path: FieldPath): string | null;

  /**
   * For uncontrolled inputs: read values from the DOM or an external source.
   * Provide a function that can fetch a value for any path.
   * Returns a lightweight snapshot of flags and errors for submit.
   */
  read(getDomValue: (path: FieldPath) => unknown): Snapshot;

  /**
   * Subscribe to a derived slice of the snapshot.
   * The selector must be pure and path-scoped where possible.
   * The callback fires only when the selected slice changes.
   */
  subscribe<T>(selector: (s: Snapshot) => T, cb: (slice: T) => void): () => void;
}

/** Internal field bookkeeping. */
interface FieldRecord {
  mode: "uncontrolled" | "controlled";
  validator?: Validator;
  initialValue: unknown;
  controlledValue: unknown;
  uncontrolledValue: unknown;
  touched: boolean;
  dirty: boolean;
  error: string | null;
  meta?: unknown;
  epoch: number;
}

/** Lightweight subscription entry. */
interface Subscription<T> {
  selector: (snapshot: Snapshot) => T;
  callback: (slice: T) => void;
  lastValue: T;
}

/** Validation tracking info used to ignore stale async results. */
interface ValidationTracker {
  pending: number;
}

function buildValidationResult(ok: boolean, message: string | null): ValidationResult {
  if (ok) {
    return { ok: true };
  }
  if (message !== null) {
    return { ok: false, message };
  }
  return { ok: false };
}

/**
 * Parse a dotted/array path to tokens. Uses a small LRU cache.
 */
export function parsePath(path: FieldPath): readonly string[] {
  const cached = pathCache.get(path);
  if (cached) {
    return cached;
  }

  const tokens: string[] = [];
  let buffer = "";
  let insideBracket = false;

  for (let i = 0; i < path.length; i += 1) {
    const char = path[i];
    if (char === "." && !insideBracket) {
      if (buffer) {
        tokens.push(buffer);
        buffer = "";
      }
      continue;
    }

    if (char === "[") {
      if (buffer) {
        tokens.push(buffer);
        buffer = "";
      }
      insideBracket = true;
      continue;
    }

    if (char === "]") {
      if (buffer) {
        tokens.push(buffer);
        buffer = "";
      }
      insideBracket = false;
      continue;
    }

    buffer += char;
  }

  if (buffer) {
    tokens.push(buffer);
  }

  const frozen = Object.freeze(tokens.slice());
  pathCache.set(path, frozen);
  if (pathCache.size > PATH_CACHE_LIMIT) {
    const first = pathCache.keys().next();
    if (!first.done) {
      pathCache.delete(first.value);
    }
  }
  return frozen;
}

/**
 * Get a value from a nested object by tokens.
 */
export function getAtPath(obj: unknown, tokens: readonly string[]): unknown {
  let current: unknown = obj;
  for (const token of tokens) {
    if (current == null) {
      return undefined;
    }
    const key = Array.isArray(current) ? Number(token) : token;
    if (Array.isArray(current)) {
      current = current[key as number];
    } else if (typeof current === "object") {
      current = (current as Record<string, unknown>)[key as string];
    } else {
      return undefined;
    }
  }
  return current;
}

/**
 * Set or update a value by tokens with spine-only structural sharing.
 */
export function setAtPath<T extends object>(
  obj: T,
  tokens: readonly string[],
  valueOrUpdater: unknown | ((prev: unknown) => unknown)
): T {
  if (tokens.length === 0) {
    return obj;
  }

  const [head, ...rest] = tokens as [string, ...string[]];
  const isArray = Array.isArray(obj);
  const looksNumeric = /^\d+$/.test(head);

  if (isArray && looksNumeric) {
    const index = Number(head);
    const clone = [...(obj as unknown[])];
    const prev = clone[index];

    if (rest.length === 0) {
      const nextValue =
        typeof valueOrUpdater === "function"
          ? (valueOrUpdater as (value: unknown) => unknown)(prev)
          : valueOrUpdater;
      if (Object.is(prev, nextValue)) {
        return obj;
      }
      clone[index] = nextValue;
      return clone as unknown as T;
    }

      const child = prev ?? (/^\d+$/.test(rest[0] ?? "") ? [] : {});
    const updatedChild = setAtPath(child as object, rest, valueOrUpdater);
    if (updatedChild === prev) {
      return obj;
    }
    clone[index] = updatedChild;
    return clone as unknown as T;
  }

  if (head === undefined) {
    return obj;
  }
  const clone = { ...(obj as Record<string, unknown>) };
  const hasOwnKey = Object.prototype.hasOwnProperty.call(clone, head);
  const prev = hasOwnKey ? clone[head] : undefined;

  if (rest.length === 0) {
    const nextValue =
      typeof valueOrUpdater === "function"
        ? (valueOrUpdater as (value: unknown) => unknown)(prev)
        : valueOrUpdater;
    if (Object.is(prev, nextValue)) {
      return obj;
    }
    clone[head] = nextValue;
    return clone as T;
  }

  const child = prev ?? (/^\d+$/.test(rest[0] ?? "") ? [] : {});
  const updatedChild = setAtPath(child as object, rest, valueOrUpdater);
  if (updatedChild === prev) {
    return obj;
  }
  clone[head] = updatedChild;
  return clone as T;
}

/** Internal helper to build selectors and notify subscribers. */
function notifySubscribers(subscribers: Set<Subscription<unknown>>, snapshot: Snapshot) {
  for (const sub of subscribers) {
    const nextValue = sub.selector(snapshot);
    if (!Object.is(nextValue, sub.lastValue)) {
      sub.lastValue = nextValue;
      sub.callback(nextValue as never);
    }
  }
}

/**
 * Compose middleware right-to-left. Keeps the implementation obvious.
 */
export function composeMiddleware(mw: Middleware[], reducer: Next): Next {
  if (mw.length === 0) {
    return reducer;
  }

  return mw.reduceRight((acc, fn) => fn(acc), reducer);
}

/**
 * Create a new form store instance with the provided options.
 */
export function createFormStore(options: CreateStoreOptions = {}): FormStore {
  const fields = new Map<FieldPath, FieldRecord>();
  const fieldValidators = new Map<FieldPath, Set<Validator>>();
  const validationTracker = new Map<FieldPath | null, ValidationTracker>();
  const subscribers = new Set<Subscription<unknown>>();
  const middlewareBag: Middleware[] = [...(options.middleware ?? [])];
  const pluginCleanups: Array<() => void> = [];
  const eventListeners = new Map<string, Set<(payload: unknown) => () => void>>();

  let epoch = 0;

  const snapshot: Snapshot = {
    getTouched(path: FieldPath) {
      return fields.get(path)?.touched ?? false;
    },
    getDirty(path: FieldPath) {
      return fields.get(path)?.dirty ?? false;
    },
    getError(path: FieldPath) {
      return fields.get(path)?.error ?? null;
    }
  };

  const emitEvent = (type: "register" | "unregister" | "validate" | "commit", payload: unknown) => {
    const listeners = eventListeners.get(type);
    if (!listeners || listeners.size === 0) {
      return;
    }
    for (const listener of listeners) {
      const cleanup = listener(payload);
      if (typeof cleanup === "function") {
        pluginCleanups.push(cleanup);
      }
    }
  };

  const runMutation = <R>(
    type: string,
    path: FieldPath | undefined,
    payload: unknown,
    apply: () => { changed: boolean; value: R }
  ): R => {
    const context: MutCtx = {
      type,
      path,
      payload,
      epoch: ++epoch,
      now: Date.now()
    };

    const resultBox: { value: R | undefined } = { value: undefined };

    const base: Next = () => {
      const { changed, value } = apply();
      resultBox.value = value;
      if (changed) {
        notifySubscribers(subscribers, snapshot);
        emitEvent("commit", { type, path, payload, epoch: context.epoch });
      }
    };

    const runner = composeMiddleware(middlewareBag, base);
    runner(context);
    return resultBox.value as R;
  };

  const ensureValidatorEntry = (path: FieldPath) => {
    let list = fieldValidators.get(path);
    if (!list) {
      list = new Set();
      fieldValidators.set(path, list);
    }
    return list;
  };

  const addValidatorInternal = (path: FieldPath, validator: Validator) => {
    const list = ensureValidatorEntry(path);
    list.add(validator);
    return () => {
      list?.delete(validator);
    };
  };

  const getValidationBucket = (path: FieldPath | null) => {
    let tracker = validationTracker.get(path);
    if (!tracker) {
      tracker = { pending: 0 };
      validationTracker.set(path, tracker);
    }
    return tracker;
  };

  const performValidation = (path?: FieldPath): ValidationResult | Promise<ValidationResult> => {
    if (path) {
      const validators = fieldValidators.get(path);
      const record = fields.get(path);
      if (!validators || validators.size === 0 || !record) {
        if (record && record.error !== null) {
          record.error = null;
        }
        emitEvent("validate", { path, result: { ok: true } });
        return { ok: true };
      }
      const bucket = getValidationBucket(path);
      const value = record.mode === "controlled" ? record.controlledValue : record.uncontrolledValue;
      const tasks = Array.from(validators);
      let syncOk = true;
      let syncMessage: string | null = null;
      const promises: Promise<ValidationResult>[] = [];
      bucket.pending += 1;
      const ticket = bucket.pending;
      for (const validator of tasks) {
        const result = validator(value, path, snapshot);
        if (result instanceof Promise) {
          promises.push(
            result.then((res) => {
              if (bucket.pending !== ticket) {
                return res;
              }
              return res;
            })
          );
          continue;
        }
        if (!result.ok && syncOk) {
          syncOk = false;
          syncMessage = result.message ?? null;
        }
      }

      if (promises.length > 0) {
        return Promise.all(promises).then((results) => {
          if (bucket.pending !== ticket) {
            return { ok: true };
          }
          const firstFail = results.find((res) => !res.ok);
          const finalResult = firstFail ?? buildValidationResult(syncOk, syncMessage);
          record.error = finalResult.ok ? null : finalResult.message ?? null;
          notifySubscribers(subscribers, snapshot);
          emitEvent("validate", { path, result: finalResult });
          return finalResult;
        });
      }

      const final = buildValidationResult(syncOk, syncMessage);
      record.error = final.ok ? null : final.message ?? null;
      emitEvent("validate", { path, result: final });
      return final;
    }

    const fieldPaths = Array.from(fields.keys());
    const results = fieldPaths.map((p) => performValidation(p));
    if (results.some((res) => res instanceof Promise)) {
      return Promise.all(results).then((resolved) => {
        const firstFail = resolved.find((res) => !res.ok);
        const formOk = firstFail ? firstFail : { ok: true };
        if (!formOk.ok) {
          emitEvent("validate", { path: null, result: formOk });
        }
        return formOk;
      });
    }

    const firstFail = (results as ValidationResult[]).find((res) => !res.ok);
    const formResult = firstFail ?? { ok: true };
    if (!formResult.ok) {
      emitEvent("validate", { path: null, result: formResult });
    }
    return formResult;
  };

  const store: FormStore = {
    register(path, opts = {}) {
      return runMutation("register", path, opts, () => {
        const existing = fields.get(path);
        const mode = opts.mode ?? existing?.mode ?? "uncontrolled";
        const nextInitialValue = opts.initialValue ?? existing?.initialValue;
        let record: FieldRecord;

        if (existing) {
          record = existing;
        } else {
          record = {
            mode,
            initialValue: nextInitialValue,
            controlledValue: nextInitialValue,
            uncontrolledValue: nextInitialValue,
            touched: false,
            dirty: false,
            error: null,
            epoch: 0
          };
        }

        record.mode = mode;

        if (opts.validate) {
          record.validator = opts.validate;
          addValidatorInternal(path, opts.validate);
        }

        if (nextInitialValue !== undefined && (opts.initialValue !== undefined || !existing)) {
          record.initialValue = nextInitialValue;
          if (record.mode === "controlled") {
            record.controlledValue = nextInitialValue;
          }
          record.uncontrolledValue = nextInitialValue;
          record.dirty = false;
        }

        if (record.mode === "controlled" && record.controlledValue === undefined) {
          record.controlledValue = record.initialValue;
        }

        if (record.mode === "uncontrolled" && record.uncontrolledValue === undefined) {
          record.uncontrolledValue = record.initialValue;
        }

        if (opts.meta !== undefined) {
          record.meta = opts.meta;
        }

        fields.set(path, record);
        emitEvent("register", { path, options: opts });

        const cleanup = () =>
          runMutation("unregister", path, undefined, () => {
            const existed = fields.delete(path);
            fieldValidators.delete(path);
            if (existed) {
              emitEvent("unregister", { path });
            }
            return { changed: existed, value: undefined };
          });

        return { changed: true, value: cleanup };
      });
    },

    markTouched(path) {
      runMutation("markTouched", path, undefined, () => {
        const record = fields.get(path);
        if (!record) {
          return { changed: false, value: undefined };
        }
        if (record.touched) {
          return { changed: false, value: undefined };
        }
        record.touched = true;
        return { changed: true, value: undefined };
      });
    },

    markDirty(path) {
      runMutation("markDirty", path, undefined, () => {
        const record = fields.get(path);
        if (!record) {
          return { changed: false, value: undefined };
        }
        if (record.dirty) {
          return { changed: false, value: undefined };
        }
        record.dirty = true;
        return { changed: true, value: undefined };
      });
    },

    setControlledValue(path, value) {
      runMutation("setControlledValue", path, value, () => {
        const record = fields.get(path);
        if (!record) {
          return { changed: false, value: undefined };
        }
        if (record.mode !== "controlled") {
          record.mode = "controlled";
        }
        record.controlledValue = value;
        const nextDirty = !Object.is(value, record.initialValue);
        if (record.dirty === nextDirty) {
          return { changed: false, value: undefined };
        }
        record.dirty = nextDirty;
        return { changed: true, value: undefined };
      });
    },

    validate(path) {
      const result = performValidation(path);
      if (!(result instanceof Promise)) {
        notifySubscribers(subscribers, snapshot);
      }
      return result;
    },

    getTouched(path) {
      return fields.get(path)?.touched ?? false;
    },

    getDirty(path) {
      return fields.get(path)?.dirty ?? false;
    },

    getError(path) {
      return fields.get(path)?.error ?? null;
    },

    read(getDomValue) {
      let changed = false;
      for (const [path, record] of fields) {
        if (record.mode === "uncontrolled") {
          const value = getDomValue(path);
          const nextDirty = !Object.is(value, record.initialValue);
          if (!Object.is(record.uncontrolledValue, value)) {
            record.uncontrolledValue = value;
          }
          if (record.dirty !== nextDirty) {
            record.dirty = nextDirty;
            changed = true;
          }
        }
      }
      if (changed) {
        notifySubscribers(subscribers, snapshot);
        emitEvent("commit", { type: "read", path: undefined });
      }
      return snapshot;
    },

    subscribe(selector, cb) {
      const entry: Subscription<unknown> = {
        selector,
        callback: cb as (slice: unknown) => void,
        lastValue: selector(snapshot)
      };
      subscribers.add(entry);
      cb(entry.lastValue as never);
      return () => {
        subscribers.delete(entry);
      };
    }
  };

  const pluginContext: PluginContext = {
    on(event, cb) {
      let set = eventListeners.get(event);
      if (!set) {
        set = new Set();
        eventListeners.set(event, set);
      }
      set.add(cb);
      return () => {
        set?.delete(cb);
      };
    },
    addMiddleware(mw) {
      middlewareBag.push(mw);
    },
    addValidator(path, validator) {
      return addValidatorInternal(path, validator);
    },
    parsePath,
    subscribe: store.subscribe
  };

  for (const plugin of options.plugins ?? []) {
    const cleanup = plugin.setup(pluginContext);
    if (typeof cleanup === "function") {
      pluginCleanups.push(cleanup);
    }
  }

  return store;
}

/**
 * Minimal convenience hook mirroring the previous experimental API.
 * This allows incremental migration for existing experiments.
 */
export function useRezendForm(config: { id: string }) {
  return { id: config.id };
}
