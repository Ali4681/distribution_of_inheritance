"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { ApiException } from "./api-client";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

export interface AsyncResult<T> extends AsyncState<T> {
  refetch: () => void;
}

export interface MutationResult<TArgs, TResult> {
  mutate: (args: TArgs) => Promise<TResult>;
  loading: boolean;
  error: string | null;
  reset: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function extractMessage(err: unknown): string {
  if (err instanceof ApiException) return err.message;
  if (err instanceof Error) return err.message;
  return "An unexpected error occurred";
}

/**
 * Keeps a ref in sync with the latest value of `value` without touching it
 * during render. useLayoutEffect runs synchronously after DOM mutations but
 * before the browser paints, so the ref is always up-to-date before any
 * async effect reads it.
 */
function useLatestRef<T>(value: T): React.RefObject<T> {
  const ref = useRef<T>(value);
  // ✅ Mutation happens inside useLayoutEffect — not during render.
  useLayoutEffect(() => {
    ref.current = value;
  });
  return ref;
}

// ─── useAsync ─────────────────────────────────────────────────────────────────

export function useAsync<T>(
  fn: () => Promise<T>,
  deps: unknown[] = [],
  enabled = true,
): AsyncResult<T> {
  const [state, setState] = useState<AsyncState<T>>({
    data: null,
    loading: enabled,
    error: null,
  });

  const [refetchToken, setRefetchToken] = useState(0);
  const fnRef = useLatestRef(fn);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;

    fnRef.current().then(
      (data) => {
        if (!cancelled) setState({ data, loading: false, error: null });
      },
      (err: unknown) => {
        if (!cancelled)
          setState({ data: null, loading: false, error: extractMessage(err) });
      },
    );

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, refetchToken, ...deps]);

  const refetch = useCallback(() => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    setRefetchToken((n) => n + 1);
  }, []);

  return { ...state, refetch };
}

// ─── useMutation ──────────────────────────────────────────────────────────────

export function useMutation<TArgs, TResult>(
  fn: (args: TArgs) => Promise<TResult>,
): MutationResult<TArgs, TResult> {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fnRef = useLatestRef(fn);

  const mutate = useCallback(async (args: TArgs): Promise<TResult> => {
    setLoading(true);
    setError(null);
    try {
      const result = await fnRef.current(args);
      setLoading(false);
      return result;
    } catch (err) {
      setError(extractMessage(err));
      setLoading(false);
      throw err;
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const reset = useCallback(() => setError(null), []);

  return { mutate, loading, error, reset };
}

// ─── usePolling ───────────────────────────────────────────────────────────────

export function usePolling<T>(
  fn: () => Promise<T>,
  intervalMs: number,
  enabled = true,
): AsyncState<T> {
  const [state, setState] = useState<AsyncState<T>>({
    data: null,
    loading: true,
    error: null,
  });

  const fnRef = useLatestRef(fn);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;

    const run = () => {
      fnRef.current().then(
        (data) => {
          if (!cancelled) setState({ data, loading: false, error: null });
        },
        (err: unknown) => {
          if (!cancelled)
            setState((prev) => ({
              ...prev,
              loading: false,
              error: extractMessage(err),
            }));
        },
      );
    };

    run();
    const timer = setInterval(run, intervalMs);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [intervalMs, enabled]); // eslint-disable-line react-hooks/exhaustive-deps

  return state;
}
