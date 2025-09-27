import { Box, Flex, HStack, Text, VStack, chakra } from '@chakra-ui/react';
import { keyframes } from '@emotion/react';
import { Plugin } from '@form/core';
import {
  ChangeEvent,
  Fragment,
  MutableRefObject,
  useContext,
  useEffect,
  useMemo,
  memo,
  useRef,
  useState,
  useTransition
} from 'react';
import { FormContext, FormProvider, useField, useForm } from '../hooks/useForm';

const highlightFlash = keyframes`
  0% { background-color: rgba(66, 153, 225, 0.35); }
  100% { background-color: transparent; }
`;

const scheduleIdleTask = (fn: () => void): { cancel: () => void } => {
  if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
    const handle = (window as typeof window & { requestIdleCallback: (cb: IdleRequestCallback) => number }).requestIdleCallback(
      () => fn()
    );
    return {
      cancel: () => {
        if ('cancelIdleCallback' in window) {
          (window as typeof window & { cancelIdleCallback: (id: number) => void }).cancelIdleCallback(handle);
        }
      }
    };
  }
  const timeout = setTimeout(fn, 16);
  return {
    cancel: () => clearTimeout(timeout)
  };
};

const MIN_DIMENSION = 5;
const MAX_DIMENSION = 60;

type CommitEvent = {
  type: string;
  path?: string;
  payload?: unknown;
  epoch: number;
};

type CommitListener = (event: CommitEvent) => void;

interface Cell {
  row: number;
  col: number;
  label: string;
  path: string;
  initialValue: number;
}

const columnLabel = (index: number): string => {
  let result = '';
  let i = index;
  while (i >= 0) {
    result = String.fromCharCode((i % 26) + 65) + result;
    i = Math.floor(i / 26) - 1;
  }
  return result;
};

const DimensionControl = ({
  label,
  value,
  onChange
}: {
  label: string;
  value: number;
  onChange: (val: number) => void;
}) => {
  const clamp = (val: number) =>
    Math.min(MAX_DIMENSION, Math.max(MIN_DIMENSION, Math.round(val)));

  const handleRangeChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChange(clamp(Number(event.target.value)));
  };

  const handleNumberChange = (event: ChangeEvent<HTMLInputElement>) => {
    const next = Number(event.target.value);
    if (!Number.isNaN(next)) {
      onChange(clamp(next));
    }
  };

  return (
    <Box width={{ base: 'full', md: '280px' }}>
      <Text fontWeight="semibold" mb={1}>
        {label}: {value}
      </Text>
      <chakra.input
        type="range"
        width="100%"
        min={MIN_DIMENSION}
        max={MAX_DIMENSION}
        value={value}
        onChange={handleRangeChange}
      />
      <chakra.input
        type="number"
        width="100%"
        mt={2}
        min={MIN_DIMENSION}
        max={MAX_DIMENSION}
        value={value}
        onChange={handleNumberChange}
      />
    </Box>
  );
};

const Field = memo(({ cell }: { cell: Cell }) => {
  const { fieldProps, highlightKey } = useField(cell.path, {
    initialValue: cell.initialValue
  });
  const [isHighlighting, setIsHighlighting] = useState(false);

  useEffect(() => {
    if (highlightKey === 0) {
      return;
    }
    setIsHighlighting(false);
    const raf = requestAnimationFrame(() => setIsHighlighting(true));
    return () => cancelAnimationFrame(raf);
  }, [highlightKey]);

  return (
    <chakra.input
      {...fieldProps}
      aria-label={cell.label}
      borderColor="gray.200"
      borderWidth="1px"
      borderRadius="md"
      padding="0.5rem"
      width="100%"
      animation={isHighlighting ? `${highlightFlash} 2s ease` : undefined}
      animationFillMode={isHighlighting ? 'forwards' : undefined}
      onAnimationEnd={() => setIsHighlighting(false)}
    />
  );
}, (prev, next) => prev.cell === next.cell);

const PerformanceFormComponent = ({
  metricsListenerRef
}: {
  metricsListenerRef: MutableRefObject<CommitListener | null>;
}) => {
  const store = useContext(FormContext)!;
  const [rowCount, setRowCount] = useState(25);
  const [colCount, setColCount] = useState(40);
  const [displayRowCount, setDisplayRowCount] = useState(rowCount);
  const [displayColCount, setDisplayColCount] = useState(colCount);
  const [, startTransition] = useTransition();
  const [renderTime, setRenderTime] = useState(0);
  const [metrics, setMetrics] = useState<{ totalUpdates: number; lastDelta: number | null }>({
    totalUpdates: 0,
    lastDelta: null
  });
  const [fps, setFps] = useState(0);
  const [fpsHistory, setFpsHistory] = useState<number[]>([]);

  const lastUpdateRef = useRef<number | null>(null);
  const frameCountRef = useRef(0);
  const lastSampleRef = useRef(performance.now());
  const rafRef = useRef<number>();
  const metricsRafRef = useRef<number | null>(null);
  const pendingUpdatesRef = useRef(0);
  const pendingDeltaRef = useRef<number | null>(null);
  const idleTaskRef = useRef<{ cancel: () => void } | null>(null);

  const columnHeaders = useMemo(
    () => Array.from({ length: colCount }, (_, idx) => columnLabel(idx)),
    [colCount]
  );

  const rowHeaders = useMemo(
    () => Array.from({ length: rowCount }, (_, idx) => idx + 1),
    [rowCount]
  );

  const cells = useMemo<Cell[]>(() => {
    const result: Cell[] = [];
    for (let row = 0; row < rowCount; row += 1) {
      for (let col = 0; col < colCount; col += 1) {
        const label = `${columnLabel(col)}${row + 1}`;
        const linearIndex = row * colCount + col;
        const initialValue = 1111 + (linearIndex % 8889);
        result.push({
          row,
          col,
          label,
          path: `grid[${row}][${col}]`,
          initialValue
        });
      }
    }
    return result;
  }, [rowCount, colCount]);

  const totalCells = cells.length;

  useEffect(() => {
    const start = performance.now();
    const raf = requestAnimationFrame(() => {
      setRenderTime(performance.now() - start);
    });
    return () => cancelAnimationFrame(raf);
  }, [rowCount, colCount]);

  useEffect(() => {
    setDisplayRowCount(rowCount);
  }, [rowCount]);

  useEffect(() => {
    setDisplayColCount(colCount);
  }, [colCount]);

  useEffect(() => {
    const handleCommit: CommitListener = (event) => {
      if (event.type !== 'setControlledValue' || !event.path?.startsWith('grid[')) {
        return;
      }
      const now = performance.now();
      const previous = lastUpdateRef.current;
      if (previous !== null) {
        pendingDeltaRef.current = now - previous;
      }
      lastUpdateRef.current = now;
      pendingUpdatesRef.current += 1;
      if (metricsRafRef.current == null) {
        metricsRafRef.current = requestAnimationFrame(() => {
          metricsRafRef.current = null;
          const pending = pendingUpdatesRef.current;
          if (pending === 0) {
            return;
          }
          const pendingDelta = pendingDeltaRef.current;
          pendingUpdatesRef.current = 0;
          pendingDeltaRef.current = null;
          setMetrics((prev) => ({
            totalUpdates: prev.totalUpdates + pending,
            lastDelta: pendingDelta ?? prev.lastDelta
          }));
        });
      }
    };

    lastUpdateRef.current = performance.now();
    metricsListenerRef.current = handleCommit;

    return () => {
      if (metricsListenerRef.current === handleCommit) {
        metricsListenerRef.current = null;
      }
      if (metricsRafRef.current != null) {
        cancelAnimationFrame(metricsRafRef.current);
        metricsRafRef.current = null;
      }
      pendingUpdatesRef.current = 0;
      pendingDeltaRef.current = null;
    };
  }, [metricsListenerRef]);

  useEffect(() => {
    const measure = (now: number) => {
      frameCountRef.current += 1;
      const elapsed = now - lastSampleRef.current;
      if (elapsed >= 1000) {
        const currentFps = (frameCountRef.current / elapsed) * 1000;
        setFps(currentFps);
        setFpsHistory((history) => {
          const next = [...history, currentFps];
          if (next.length > 20) {
            next.shift();
          }
          return next;
        });
        frameCountRef.current = 0;
        lastSampleRef.current = now;
      }
      rafRef.current = requestAnimationFrame(measure);
    };

    rafRef.current = requestAnimationFrame(measure);
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (cells.length === 0) {
      return;
    }

    const processUpdates = () => {
      idleTaskRef.current = null;
      const updatesPerTick = Math.max(1, Math.floor(cells.length * 0.03));
      const used = new Set<number>();
      for (let i = 0; i < updatesPerTick; i += 1) {
        let index: number;
        do {
          index = Math.floor(Math.random() * cells.length);
        } while (used.has(index));
        used.add(index);
        const cell = cells[index];
        const randomValue = 1111 + Math.floor(Math.random() * 8889);
        store.setControlledValue(cell.path, randomValue);
      }
    };

    const interval = setInterval(() => {
      if (idleTaskRef.current) {
        return;
      }
      idleTaskRef.current = scheduleIdleTask(processUpdates);
    }, 1000);

    return () => {
      clearInterval(interval);
      if (idleTaskRef.current) {
        idleTaskRef.current.cancel();
        idleTaskRef.current = null;
      }
    };
  }, [store, cells]);

  return (
    <Box>
      <Flex direction={{ base: 'column', lg: 'row' }} gap={6} mb={6} align="stretch">
        <DimensionControl
          label="Rows"
          value={displayRowCount}
          onChange={(val) => {
            setDisplayRowCount(val);
            startTransition(() => setRowCount(val));
          }}
        />
        <DimensionControl
          label="Columns"
          value={displayColCount}
          onChange={(val) => {
            setDisplayColCount(val);
            startTransition(() => setColCount(val));
          }}
        />
        <Box flex="1" minWidth="220px">
          <Text fontWeight="semibold">Grid Summary</Text>
          <Text fontSize="sm" color="gray.600">
            Initial render ({rowCount} × {colCount} = {totalCells} cells):{' '}
            {renderTime.toFixed(2)}ms
          </Text>
          <Text fontSize="sm" color="gray.600">
            Updates observed: {metrics.totalUpdates}
          </Text>
          <Text fontSize="sm" color="gray.600">
            Delta since previous update:{' '}
            {metrics.lastDelta !== null ? `${metrics.lastDelta.toFixed(2)}ms` : '—'}
          </Text>
          <Text fontSize="sm" color="gray.600">
            FPS (last second): {fps.toFixed(1)}
          </Text>
          <Box height="60px" mt={3}>
            <HStack spacing={1} align="end" height="100%">
              {fpsHistory.map((value, idx) => {
                const clamped = Math.min(120, value);
                const heightPercent = (clamped / 120) * 100;
                return (
                  <Box
                    key={idx}
                    width="6px"
                    height={`${heightPercent}%`}
                    bg={value >= 55 ? 'green.400' : value >= 45 ? 'yellow.400' : 'red.400'}
                    borderRadius="sm"
                  />
                );
              })}
            </HStack>
          </Box>
        </Box>
      </Flex>

      <Box overflow="auto" borderWidth="1px" borderRadius="md" maxHeight="70vh">
        <Box
          minWidth="800px"
          display="grid"
          gridTemplateColumns={`70px repeat(${colCount}, minmax(120px, 1fr))`}
          gridAutoRows="56px"
        >
          <Box bg="gray.100" borderBottomWidth="1px" borderRightWidth="1px" />
          {columnHeaders.map((label) => (
            <Box
              key={label}
              bg="gray.100"
              borderBottomWidth="1px"
              borderRightWidth="1px"
              display="flex"
              alignItems="center"
              justifyContent="center"
              fontWeight="semibold"
            >
              {label}
            </Box>
          ))}
          {rowHeaders.map((rowLabel, rowIdx) => (
            <Fragment key={rowLabel}>
              <Box
                bg="gray.100"
                borderBottomWidth="1px"
                borderRightWidth="1px"
                display="flex"
                alignItems="center"
                justifyContent="center"
                fontWeight="semibold"
              >
                {rowLabel}
              </Box>
              {columnHeaders.map((_, colIdx) => {
                const cell = cells[rowIdx * colCount + colIdx];
                return (
                  <Box
                    key={cell.path}
                    borderBottomWidth="1px"
                    borderRightWidth="1px"
                    p={2}
                    display="flex"
                    alignItems="center"
                  >
                    <Field cell={cell} />
                  </Box>
                );
              })}
            </Fragment>
          ))}
        </Box>
      </Box>
    </Box>
  );
};

export const PerformanceForm = () => {
  const commitListenerRef = useRef<CommitListener | null>(null);

  const metricsPlugin = useMemo<Plugin>(
    () => ({
      name: 'performance-commit-metrics',
      setup(ctx) {
        const unsubscribe = ctx.on('commit', (event) => {
          commitListenerRef.current?.(event as CommitEvent);
          return () => {};
        });
        return () => {
          unsubscribe();
        };
      }
    }),
    [commitListenerRef]
  );

  const store = useForm(() => ({ plugins: [metricsPlugin] }));

  return (
    <FormProvider store={store}>
      <PerformanceFormComponent metricsListenerRef={commitListenerRef} />
    </FormProvider>
  );
};
