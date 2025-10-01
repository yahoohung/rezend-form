/**
 * @packageDocumentation
 * Plain JavaScript form store with strong TypeScript support.
 * The implementation follows simple UK English descriptions and keeps the code explicit.
 */

declare const process: { env?: Record<string, string | undefined> } | undefined;

const isDevEnvironment = () => typeof process !== "undefined" && process?.env?.NODE_ENV !== "production";

/** Maximum items stored in the path parse cache. */
const PATH_CACHE_LIMIT = 4096;

function createLRUCache<K, V>(limit: number) {
  const cache = new Map<K, V>();

  return {
    get(key: K): V | undefined {
      const value = cache.get(key);
      if (value !== undefined) {
        // Move to end to mark as recently used
        cache.delete(key);
        cache.set(key, value);
      }
      return value;
    },
    set(key: K, value: V) {
      if (limit <= 0) {
        return;
      }
      if (cache.has(key)) {
        // If exists, delete old one to re-insert at the end
        cache.delete(key);
      } else if (cache.size >= limit) {
        // If cache is full, evict least recently used
        const iterator = cache.keys().next();
        if (!iterator.done) {
          cache.delete(iterator.value);
        }
      }
      cache.set(key, value);
    },
  };
}

const pathCache = createLRUCache<string, readonly string[]>(PATH_CACHE_LIMIT);

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
  /** Returns the current value for the path (controlled or uncontrolled). */
  getValue(path: FieldPath): unknown;
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

/** Callback for wildcard subscriptions. */
export type WatchCallback = (change: { path: FieldPath; value: unknown }) => void;

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
  /** Watch for changes using a wildcard pattern. */
  watch(pattern: FieldPath, cb: WatchCallback): () => void;

  /**
   * Dispose the store and clean up any plugin resources.
   */
  destroy: FormStore["destroy"];
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
  getValue(path: FieldPath): unknown;

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

  /**
   * Watch for changes on paths matching a wildcard pattern.
   * The callback receives the exact path and value that changed.
   */
  watch(pattern: FieldPath, cb: WatchCallback): () => void;

  /**
   * Dispose the store and clean up any plugin resources.
   */
  destroy(): void;
}

/** Internal field bookkeeping. */
interface FieldRecord {
  mode: "uncontrolled" | "controlled";
  validator?: Validator;
  validators?: Set<Validator>;
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
  dependencies: Set<FieldPath>;
}

/** Wildcard subscription entry. */
interface WatchSubscription {
  pattern: FieldPath;
  tokens?: readonly string[];
  callback: WatchCallback;
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
  return frozen;
}

/**
 * Check if a path matches a wildcard pattern.
 * The wildcard `*` matches exactly one segment.
 * The pattern and path must have the same length.
 */
export function isMatch(pattern: readonly string[], path: readonly string[]): boolean {
  if (pattern.length !== path.length || pattern.length === 0) {
    return false;
  }

  return pattern.every((p, i) => p === "*" || p === path[i]);
}

/**
 * A helper type that recursively finds the type of a property at a given path.
 *
 * @template T The object type to search within.
 * @template P The dot-separated path string.
 *
 * @example
 * type User = { address: { city: string } };
 * type CityType = GetValue<User, 'address.city'>; // string
 *
 * @remarks This type provides type-level inference for dot-separated paths.
 * The runtime implementation correctly handles all path notations supported by `parsePath`.
 */
export type GetValue<T, P extends string> = P extends `${infer Key}.${infer Rest}`
  ? Key extends keyof T
    ? GetValue<NonNullable<T[Key]>, Rest>
    : undefined
  : P extends keyof T
  ? T[P]
  : undefined;

/**
 * Gets the value of a deeply nested property from an object using a path string.
 * This function is type-safe, and the return type is inferred from the path.
 *
 * The type-level inference currently only supports dot-notation paths.
 * The runtime logic supports all paths handled by `parsePath`.
 *
 * @param obj The object to retrieve the property from.
 * @param path A dot-separated string representing the path to the property.
 * @returns The value of the property, or undefined if the path is invalid.
 */
export function getValue<T extends object, P extends string>(obj: T, path: P): GetValue<T, P> {
  const tokens = parsePath(path);
  return getAtPath(obj, tokens) as GetValue<T, P>;
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
 * Sets the value of a deeply nested property in an object using a path string.
 * This function is type-safe and supports structural sharing.
 *
 * The type-level inference currently only supports dot-notation paths.
 * The runtime logic supports all paths handled by `parsePath`.
 *
 * @param obj The object to update.
 * @param path A dot-separated string representing the path to the property.
 * @param valueOrUpdater The new value or a function that receives the previous value and returns the new one.
 * @returns A new object with the updated property, or the original object if the value is unchanged.
 */
export function setValue<T extends object, P extends string>(
  obj: T,
  path: P,
  valueOrUpdater: GetValue<T, P> | ((prev: GetValue<T, P>) => GetValue<T, P>)
): T {
  const tokens = parsePath(path);
  return setAtPath(obj, tokens, valueOrUpdater as any);
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

/** Internal helper to notify wildcard subscribers. */
function notifyWatchers(
  specificWatchers: Map<FieldPath, Set<WatchSubscription>>,
  wildcardWatchers: Set<WatchSubscription>,
  changedPath: FieldPath,
  newValue: unknown
) {
  const specific = specificWatchers.get(changedPath);
  if (specific) {
    for (const watcher of specific) {
      watcher.callback({ path: changedPath, value: newValue });
    }
  }

  // Wildcard logic is functionally removed.
  // const pathTokens = parsePath(changedPath);
  // for (const watcher of wildcardWatchers) {
  //   if (!watcher.tokens) {
  //     watcher.tokens = parsePath(watcher.pattern);
  //   }
  //   if (isMatch(watcher.tokens, pathTokens)) {
  //     watcher.callback({ path: changedPath, value: newValue });
  //   }
  // }
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

const NO_WATCH_VALUE = Symbol("rezend:no-watch");

interface MutationResult<R> {
  changed: boolean;
  value: R;
  watchValue?: unknown;
}

/**
 * Create a new form store instance with the provided options.
 */
export function createFormStore(options: CreateStoreOptions = {}): FormStore {
  const fields = new Map<FieldPath, FieldRecord>();
  const fieldLookup: Record<FieldPath, FieldRecord | undefined> = Object.create(null);
  const fieldValidators = new Map<FieldPath, Set<Validator>>();
  const validationTracker = new Map<FieldPath | null, ValidationTracker>();
  const subscribers = new Set<Subscription<unknown>>();
  const subscribersByPath = new Map<FieldPath, Set<Subscription<unknown>>>();
  const specificWatchers = new Map<FieldPath, Set<WatchSubscription>>();
  const wildcardWatchers = new Set<WatchSubscription>();
  const middlewareBag: Middleware[] = [...(options.middleware ?? [])];
  const pluginCleanups: Array<() => void> = [];
  const eventListeners = new Map<string, Set<(payload: unknown) => () => void>>();
  let totalEventListeners = 0;
  let totalSpecificWatchers = 0;
  let subscriberCount = 0;
  let hasMiddleware = middlewareBag.length > 0;
  let simpleWriteFastPathEnabled = false;

  const updateSimpleWriteFastPath = () => {
    simpleWriteFastPathEnabled =
      !hasMiddleware &&
      subscriberCount === 0 &&
      totalSpecificWatchers === 0 &&
      wildcardWatchers.size === 0 &&
      totalEventListeners === 0;
  };

  updateSimpleWriteFastPath();

  let isNotificationScheduled = false;
  let hasChangedInBatch = false;
  const changedPathsInBatch = new Set<FieldPath>();
  const watchQueue: Array<{ path: FieldPath; value: unknown }> = [];

  let epoch = 0;
  let currentDependencies: Set<FieldPath> | null = null;

  const getFieldRecord = (path: FieldPath): FieldRecord | undefined => fieldLookup[path];

  const setFieldRecord = (path: FieldPath, record: FieldRecord) => {
    fields.set(path, record);
    fieldLookup[path] = record;
  };

  const deleteFieldRecord = (path: FieldPath) => {
    const existed = fields.delete(path);
    if (existed) {
      delete fieldLookup[path];
    }
    return existed;
  };

  const snapshot: Snapshot = {
    getTouched(path: FieldPath) {
      return getFieldRecord(path)?.touched ?? false;
    },
    getDirty(path: FieldPath) {
      return getFieldRecord(path)?.dirty ?? false;
    },
    getError(path: FieldPath) {
      return getFieldRecord(path)?.error ?? null;
    },
    getValue(path: FieldPath) {
      const record = getFieldRecord(path);
      if (!record) {
        return undefined;
      }
      return record.mode === "controlled" ? record.controlledValue : record.uncontrolledValue;
    }
  };

  const snapshotProxyHandler: ProxyHandler<Snapshot> = {
    get(target, prop: keyof Snapshot, receiver) {
      const originalMethod = target[prop];
      if (prop === "getTouched" || prop === "getDirty" || prop === "getError" || prop === "getValue") {
        return (path: FieldPath) => {
          if (currentDependencies) {
            currentDependencies.add(path);
          }
          return originalMethod.call(target, path);
        };
      }
      return Reflect.get(target, prop, receiver);
    }
  };
  const proxiedSnapshot = new Proxy(snapshot, snapshotProxyHandler);

  const flushNotifications = () => {
    if (hasChangedInBatch) {
      const subscribersToNotify = new Set<Subscription<unknown>>();
      for (const path of changedPathsInBatch) {
        const pathSubscribers = subscribersByPath.get(path);
        if (pathSubscribers) {
          for (const sub of pathSubscribers) {
            subscribersToNotify.add(sub);
          }
        }
      }

      for (const sub of subscribersToNotify) {
        const oldDependencies = sub.dependencies;
        sub.dependencies = new Set<FieldPath>();

        currentDependencies = sub.dependencies;
        let nextValue;
        try {
          nextValue = sub.selector(proxiedSnapshot);
        } finally {
          currentDependencies = null;
        }

        const newDependencies = sub.dependencies;

        for (const path of oldDependencies) {
          if (!newDependencies.has(path)) {
            const set = subscribersByPath.get(path);
            if (set) {
              set.delete(sub);
              if (set.size === 0) {
                subscribersByPath.delete(path);
              }
            }
          }
        }
        for (const path of newDependencies) {
          if (!oldDependencies.has(path)) {
            if (!subscribersByPath.has(path)) {
              subscribersByPath.set(path, new Set());
            }
            subscribersByPath.get(path)!.add(sub);
          }
        }

        if (!Object.is(nextValue, sub.lastValue)) {
          sub.lastValue = nextValue;
          sub.callback(nextValue as never);
        }
      }
    }

    // Reset for next batch
    hasChangedInBatch = false;
    changedPathsInBatch.clear();

    // Process batched watch events
    if (watchQueue.length > 0) {
      let index = 0;
      while (index < watchQueue.length) {
        const event = watchQueue[index];
        if (event) {
          notifyWatchers(specificWatchers, wildcardWatchers, event.path, event.value);
        }
        index += 1;
      }
      watchQueue.length = 0;
    }
    isNotificationScheduled = false;
  };

  const emitEvent = (type: "register" | "unregister" | "validate" | "commit", payload: unknown) => {
    if (totalEventListeners === 0) {
      return;
    }
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
    apply: () => MutationResult<R>
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
      const result = apply();
      const { changed, value } = result;
      const watchValue = "watchValue" in result ? result.watchValue : NO_WATCH_VALUE;
      resultBox.value = value;

      if (changed) {
        const shouldNotifySubscribers = subscribers.size > 0;
        const shouldNotifyWatchers = totalSpecificWatchers > 0 || wildcardWatchers.size > 0;

        if (shouldNotifySubscribers) {
          hasChangedInBatch = true;
          if (path) {
            changedPathsInBatch.add(path);
          }
        }
        if (
          shouldNotifyWatchers &&
          path &&
          watchValue !== NO_WATCH_VALUE &&
          (specificWatchers.has(path) || wildcardWatchers.size > 0)
        ) {
          watchQueue.push({ path, value: watchValue });
        }
        if ((shouldNotifySubscribers || shouldNotifyWatchers) && !isNotificationScheduled) {
          isNotificationScheduled = true;
          queueMicrotask(flushNotifications);
        }
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
    const record = getFieldRecord(path);
    if (record) {
      record.validators = list;
    }
    return list;
  };

  const addValidatorInternal = (path: FieldPath, validator: Validator) => {
    const list = ensureValidatorEntry(path);
    list.add(validator);
    const record = getFieldRecord(path);
    if (record) {
      record.validators = list;
    }
    return () => {
      list?.delete(validator);
      if (list && list.size === 0) {
        fieldValidators.delete(path);
        const currentRecord = getFieldRecord(path);
        if (currentRecord) {
          currentRecord.validators = undefined;
        }
      }
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
      const record = getFieldRecord(path);
      if (!record) {
        if (isDevEnvironment()) {
          console.warn(`[rezend] validate: field '${path}' not registered.`);
        }
        emitEvent("validate", { path, result: { ok: true } });
        return { ok: true };
      }

      const validators = record.validators ?? fieldValidators.get(path);
      if (!validators || validators.size === 0) {
        if (record.error !== null) {
          record.error = null;
        }
        emitEvent("validate", { path, result: { ok: true } });
        return { ok: true };
      }

      const value = record.mode === "controlled" ? record.controlledValue : record.uncontrolledValue;
      const tasks = Array.from(validators);
      let syncOk = true;
      let syncMessage: string | null = null;
      const promises: Promise<ValidationResult>[] = [];
      let bucket: ValidationTracker | null = null;
      let ticket = 0;

      for (const validator of tasks) {
        const result = validator(value, path, snapshot);
        if (result instanceof Promise) {
          if (!bucket) {
            bucket = getValidationBucket(path);
            bucket.pending += 1;
            ticket = bucket.pending;
          }
          promises.push(
            result.then((res) => {
              if (bucket && bucket.pending !== ticket) {
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

      if (promises.length > 0 && bucket) {
        return Promise.all(promises).then((results) => {
          if (bucket && bucket.pending !== ticket) {
            return { ok: true };
          }
          const firstFail = results.find((res) => !res.ok);
          const finalResult = firstFail ?? buildValidationResult(syncOk, syncMessage);
          const nextError = finalResult.ok ? null : finalResult.message ?? null;
          if (record.error !== nextError) {
            record.error = nextError;
          }
          notifySubscribers(subscribers, snapshot);
          emitEvent("validate", { path, result: finalResult });
          return finalResult;
        });
      }

      const final = buildValidationResult(syncOk, syncMessage);
      const nextError = final.ok ? null : final.message ?? null;
      if (record.error !== nextError) {
        record.error = nextError;
      }
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
        const existing = getFieldRecord(path);
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

        setFieldRecord(path, record);

        const existingValidators = fieldValidators.get(path);
        if (opts.validate) {
          const validatorSet = existingValidators ?? ensureValidatorEntry(path);
          validatorSet.add(opts.validate);
          record.validators = validatorSet;
        } else if (existingValidators) {
          record.validators = existingValidators;
        } else {
          record.validators = undefined;
        }

        if (opts.validate) {
          record.validator = opts.validate;
        }
        emitEvent("register", { path, options: opts });

        const cleanup = () =>
          runMutation("unregister", path, undefined, () => {
            const existed = deleteFieldRecord(path);
            fieldValidators.delete(path);
            if (existed) {
              emitEvent("unregister", { path });
              return { changed: true, value: undefined, watchValue: undefined };
            }
            return { changed: false, value: undefined };
          });

        return { changed: true, value: cleanup };
      });
    },

    markTouched(path) {
      runMutation("markTouched", path, undefined, () => {
        const record = getFieldRecord(path);
        if (!record) {
          if (isDevEnvironment()) {
            console.warn(`[rezend] markTouched: field '${path}' not registered.`);
          }
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
        const record = getFieldRecord(path);
        if (!record) {
          if (isDevEnvironment()) {
            console.warn(`[rezend] markDirty: field '${path}' not registered.`);
          }
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
      const record = getFieldRecord(path);
      if (!record) {
        if (isDevEnvironment()) {
          console.warn(`[rezend] setControlledValue: field '${path}' not registered.`);
        }
        return;
      }
      if (record.mode !== "controlled") {
        if (isDevEnvironment()) {
          console.warn(
            `[rezend] setControlledValue: field '${path}' is not in 'controlled' mode. The mode has been automatically switched. This may indicate a bug in your code.`
          );
        }
        record.mode = "controlled";
      }

      const previousValue = record.controlledValue;
      const valueChanged = !Object.is(previousValue, value);
      const nextDirty = !Object.is(value, record.initialValue);
      const dirtyChanged = record.dirty !== nextDirty;

      if (!valueChanged && !dirtyChanged) {
        return;
      }

      if (simpleWriteFastPathEnabled) {
        if (valueChanged) {
          record.controlledValue = value;
        }
        if (dirtyChanged) {
          record.dirty = nextDirty;
        }
        return;
      }

      runMutation("setControlledValue", path, value, () => {
        const target = getFieldRecord(path);
        if (!target) {
          return { changed: false, value: undefined };
        }
        const previous = target.controlledValue;
        const valueDidChange = !Object.is(previous, value);
        const nextDirtyState = !Object.is(value, target.initialValue);
        const dirtyDidChange = target.dirty !== nextDirtyState;

        if (!valueDidChange && !dirtyDidChange) {
          return { changed: false, value: undefined };
        }

        if (valueDidChange) {
          target.controlledValue = value;
        }
        if (dirtyDidChange) {
          target.dirty = nextDirtyState;
        }
        return { changed: true, value: undefined, watchValue: value };
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
      return getFieldRecord(path)?.touched ?? false;
    },

    getDirty(path) {
      return getFieldRecord(path)?.dirty ?? false;
    },

    getError(path) {
      return getFieldRecord(path)?.error ?? null;
    },

    getValue(path) {
      const record = getFieldRecord(path);
      if (!record) {
        return undefined;
      }
      return record.mode === "controlled" ? record.controlledValue : record.uncontrolledValue;
    },

    read(getDomValue) {
      const shouldNotifySubscribers = subscribers.size > 0;
      const shouldNotifyWatchers = totalSpecificWatchers > 0 || wildcardWatchers.size > 0;
      let dirtyChanged = false;
      let valueChanged = false;
      const watchEvents: Array<{ path: FieldPath; value: unknown }> = [];
      for (const [path, record] of fields) {
        if (record.mode === "uncontrolled") {
          const value = getDomValue(path);
          const nextDirty = !Object.is(value, record.initialValue);
          if (!Object.is(record.uncontrolledValue, value)) {
            record.uncontrolledValue = value;
            valueChanged = true;
            if (shouldNotifyWatchers) {
              watchEvents.push({ path, value });
            }
            if (shouldNotifySubscribers) {
              changedPathsInBatch.add(path);
            }
          }
          if (record.dirty !== nextDirty) {
            record.dirty = nextDirty;
            dirtyChanged = true;
            if (shouldNotifySubscribers) {
              changedPathsInBatch.add(path);
            }
          }
        }
      }
      if (dirtyChanged || valueChanged) {
        if (shouldNotifySubscribers) {
          hasChangedInBatch = true;
        }
        emitEvent("commit", { type: "read", path: undefined });
      }
      if (shouldNotifyWatchers && watchEvents.length > 0) {
        for (const event of watchEvents) {
          if (specificWatchers.has(event.path) || wildcardWatchers.size > 0) {
            watchQueue.push({ path: event.path, value: event.value });
          }
        }
      }
      if (
        (shouldNotifySubscribers && (dirtyChanged || valueChanged)) ||
        (shouldNotifyWatchers && watchEvents.length > 0)
      ) {
        if (!isNotificationScheduled) {
          isNotificationScheduled = true;
          queueMicrotask(flushNotifications);
        }
      }
      return snapshot;
    },

    subscribe(selector, cb) {
      const entry: Subscription<unknown> = {
        selector,
        callback: cb as (slice: unknown) => void,
        lastValue: undefined, // Will be populated below
        dependencies: new Set<FieldPath>()
      };

      // Run the selector for the first time to track initial dependencies.
      currentDependencies = entry.dependencies;
      try {
        entry.lastValue = selector(proxiedSnapshot);
      } finally {
        currentDependencies = null;
      }

      subscribers.add(entry);
      subscriberCount += 1;
      updateSimpleWriteFastPath();

      for (const path of entry.dependencies) {
        if (!subscribersByPath.has(path)) {
          subscribersByPath.set(path, new Set());
        }
        subscribersByPath.get(path)!.add(entry);
      }

      cb(entry.lastValue as never);
      return () => {
        if (subscribers.delete(entry)) {
          subscriberCount = Math.max(0, subscriberCount - 1);
          updateSimpleWriteFastPath();
        }
        for (const path of entry.dependencies) {
          const set = subscribersByPath.get(path);
          if (set) {
            set.delete(entry);
            if (set.size === 0) {
              subscribersByPath.delete(path);
            }
          }
        }
      };
    },

    watch(pattern, cb) {
      const hasWildcard = pattern.includes("*");
      if (hasWildcard) {
        if (isDevEnvironment()) {
          console.warn(
            `[rezend] Wildcard watchers ('*') are no longer supported for performance reasons and will be ignored.`
          );
        }
        return () => {}; // Return a no-op unsubscribe function
      }

      const entry: WatchSubscription = {
        pattern,
        callback: cb
      };

      if (!specificWatchers.has(pattern)) {
        specificWatchers.set(pattern, new Set());
      }
      specificWatchers.get(pattern)!.add(entry);
      totalSpecificWatchers += 1;
      updateSimpleWriteFastPath();

      return () => {
        const set = specificWatchers.get(pattern);
        if (set && set.delete(entry)) {
          totalSpecificWatchers = Math.max(0, totalSpecificWatchers - 1);
          if (set.size === 0) {
            specificWatchers.delete(pattern);
          }
          updateSimpleWriteFastPath();
        }
      };
    },

    destroy() {
      let firstError: unknown;
      while (pluginCleanups.length > 0) {
        const cleanup = pluginCleanups.pop();
        if (!cleanup) {
          continue;
        }
        try {
          cleanup();
        } catch (error) {
          if (!firstError) {
            firstError = error;
          }
        }
      }
      eventListeners.clear();
      specificWatchers.clear();
      wildcardWatchers.clear();
      subscribers.clear();
      subscribersByPath.clear();
      fieldValidators.clear();
      fields.clear();
      validationTracker.clear();
      if (firstError) {
        throw firstError;
      }
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
      totalEventListeners += 1;
      updateSimpleWriteFastPath();
      return () => {
        if (set && set.delete(cb)) {
          totalEventListeners = Math.max(0, totalEventListeners - 1);
          if (set.size === 0) {
            eventListeners.delete(event);
          }
          updateSimpleWriteFastPath();
        }
      };
    },
    addMiddleware(mw) {
      middlewareBag.push(mw);
      hasMiddleware = true;
      updateSimpleWriteFastPath();
    },
    addValidator(path, validator) {
      return addValidatorInternal(path, validator);
    },
    parsePath,
    subscribe: store.subscribe,
    watch: store.watch,
    destroy: store.destroy
  };

  for (const plugin of options.plugins ?? []) {
    const cleanup = plugin.setup(pluginContext);
    if (typeof cleanup === "function") {
      pluginCleanups.push(cleanup);
    }
  }

  return store;
}
