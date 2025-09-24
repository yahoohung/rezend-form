import { useEffect, useMemo, useRef, useState } from "react";

export interface FpsMeterOptions {
  /** Number of samples kept in the rolling window. */
  sampleSize?: number;
  /** Minimum milliseconds between reports to subscribers. */
  reportInterval?: number;
  /** Pause measurement when the tab is hidden. */
  pauseOnHidden?: boolean;
}

export interface FpsMeter {
  start(): void;
  stop(): void;
  /** Subscribe to FPS updates (averaged over the rolling window). */
  subscribe(listener: (fps: number) => void): () => void;
  /** Latest FPS snapshot without subscribing. */
  getSnapshot(): number;
}

const hasWindow = typeof window !== "undefined" && typeof requestAnimationFrame === "function";

export function createFpsMeter(options: FpsMeterOptions = {}): FpsMeter {
  if (!hasWindow) {
    const noop = () => {};
    return {
      start: noop,
      stop: noop,
      subscribe: () => noop,
      getSnapshot: () => 0
    };
  }

  const sampleSize = Math.max(5, options.sampleSize ?? 120);
  const reportInterval = Math.max(50, options.reportInterval ?? 250);
  const pauseOnHidden = options.pauseOnHidden ?? true;

  const samples = new Float64Array(sampleSize);
  let sampleIndex = 0;
  let sampleCount = 0;
  let lastTime = performance.now();
  let lastReport = lastTime;
  let rafId: number | null = null;
  let running = false;
  let latestFps = 0;
  const subscribers = new Set<(fps: number) => void>();

  const loop = (time: number) => {
    if (!running) {
      return;
    }
    const delta = time - lastTime;
    lastTime = time;

    if (delta > 0) {
      const instant = 1000 / delta;
      samples[sampleIndex % sampleSize] = instant;
      sampleIndex += 1;
      if (sampleCount < sampleSize) {
        sampleCount += 1;
      }
    }

    if (time - lastReport >= reportInterval && sampleCount > 0) {
      let sum = 0;
      for (let i = 0; i < sampleCount; i += 1) {
        sum += samples[i];
      }
      latestFps = sum / sampleCount;
      for (const listener of subscribers) {
        listener(latestFps);
      }
      lastReport = time;
    }

    rafId = requestAnimationFrame(loop);
  };

  const start = () => {
    if (running) {
      return;
    }
    running = true;
    lastTime = performance.now();
    lastReport = lastTime;
    rafId = requestAnimationFrame(loop);
  };

  const stop = () => {
    if (!running) {
      return;
    }
    running = false;
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  };

  const subscribe = (listener: (fps: number) => void) => {
    subscribers.add(listener);
    if (!running) {
      start();
    }
    if (latestFps) {
      listener(latestFps);
    }
    return () => {
      subscribers.delete(listener);
      if (subscribers.size === 0) {
        stop();
      }
    };
  };

  const onVisibilityChange = () => {
    if (!pauseOnHidden) {
      return;
    }
    if (document.visibilityState === "hidden") {
      stop();
    } else if (subscribers.size > 0) {
      start();
    }
  };

  if (pauseOnHidden) {
    document.addEventListener("visibilitychange", onVisibilityChange);
  }

  const cleanupListeners = () => {
    if (pauseOnHidden) {
      document.removeEventListener("visibilitychange", onVisibilityChange);
    }
    stop();
    subscribers.clear();
  };

  return {
    start,
    stop,
    subscribe(listener) {
      const unsubscribe = subscribe(listener);
      return () => {
        unsubscribe();
        if (subscribers.size === 0) {
          cleanupListeners();
        }
      };
    },
    getSnapshot: () => latestFps
  };
}

export function useFps(options?: FpsMeterOptions): number {
  const meter = useMemo(() => createFpsMeter(options), []);
  const [fps, setFps] = useState(() => meter.getSnapshot());

  useEffect(() => {
    const unsubscribe = meter.subscribe((value) => {
      setFps(value);
    });
    meter.start();
    return () => {
      unsubscribe();
      meter.stop();
    };
  }, [meter]);

  return fps;
}
