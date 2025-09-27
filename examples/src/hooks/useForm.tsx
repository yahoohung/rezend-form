import {
  createFormStore,
  FormStore,
  FieldPath,
  RegisterOptions,
  CreateStoreOptions
} from '@form/core';
import React, { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react';

export const FormContext = createContext<FormStore | null>(null);

export const FormProvider = ({ store, children }: { store: FormStore; children: ReactNode }) => (
  <FormContext.Provider value={store}>{children}</FormContext.Provider>
);

type UseFormOptions = CreateStoreOptions | (() => CreateStoreOptions | undefined) | undefined;

export const useForm = (options?: UseFormOptions) => {
  const storeRef = useRef<FormStore | null>(null);
  const initialOptionsRef = useRef<CreateStoreOptions | undefined>(undefined);

  if (initialOptionsRef.current === undefined) {
    const resolved = typeof options === 'function' ? options() : options;
    initialOptionsRef.current = resolved ?? {};
  }

  if (storeRef.current === null) {
    storeRef.current = createFormStore(initialOptionsRef.current);
  }

  useEffect(() => {
    return () => {
      storeRef.current?.destroy();
      storeRef.current = null;
    };
  }, []);

  return storeRef.current!;
};

const toInputValue = (value: unknown): string => {
  if (value == null) {
    return '';
  }
  return typeof value === 'string' ? value : String(value);
};

export const useField = (path: FieldPath, options: RegisterOptions = {}) => {
  const store = useContext(FormContext);
  if (!store) {
    throw new Error('useField must be used within a FormProvider');
  }

  const [value, setValue] = useState<string>(() => {
    if (options.initialValue !== undefined) {
      return toInputValue(options.initialValue);
    }
    return toInputValue(store.getValue(path));
  });
  const [touched, setTouched] = useState(() => store.getTouched(path));
  const [error, setError] = useState(() => store.getError(path));
  const [highlightKey, setHighlightKey] = useState(0);

  const valueRef = useRef(value);
  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  const optionsRef = useRef<RegisterOptions>({ ...options, mode: options.mode ?? 'controlled' });
  useEffect(() => {
    optionsRef.current = { ...options, mode: options.mode ?? 'controlled' };
  }, [options]);

  useEffect(() => {
    const unregister = store.register(path, optionsRef.current);
    return unregister;
  }, [store, path]);

  useEffect(() => {
    if (options.initialValue !== undefined) {
      const next = toInputValue(options.initialValue);
      setValue((prev) => (Object.is(prev, next) ? prev : next));
      store.setControlledValue(path, options.initialValue);
    }
  }, [store, path, options.initialValue]);

  const triggerHighlight = () => {
    setHighlightKey((key) => key + 1);
  };

  useEffect(() => {
    const unsubscribe = store.subscribe(
      (s) => ({
        value: s.getValue(path),
        touched: s.getTouched(path),
        error: s.getError(path)
      }),
      (slice) => {
        const formatted = toInputValue(slice.value);
        if (!Object.is(valueRef.current, formatted)) {
          valueRef.current = formatted;
          setValue(formatted);
          triggerHighlight();
        }
        setTouched(slice.touched);
        setError(slice.error);
      }
    );
    return unsubscribe;
  }, [store, path]);

  const fieldProps = {
    name: path,
    value,
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      valueRef.current = newValue;
      setValue(newValue);
      store.setControlledValue(path, newValue);
      triggerHighlight();
    },
    onBlur: () => {
      store.markTouched(path);
    },
  };

  return { fieldProps, touched, error, highlightKey };
};
