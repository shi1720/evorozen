import { useCallback, useEffect, useState, type SetStateAction } from 'react';
export class RequestError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
  ) {
    super(message);
  }
}
export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`/api${path}`, {
    credentials: 'same-origin',
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
  });
  const data = await response.json().catch(() => {
    throw new RequestError(
      'The server returned an unexpected response. Please try again.',
      response.ok ? 502 : response.status,
    );
  });
  if (!response.ok) {
    if (data.code === 'UNAUTHENTICATED' && path !== '/auth/me')
      window.dispatchEvent(new Event('remainder:session-expired'));
    throw new RequestError(
      data.error || 'Something went wrong. Please try again.',
      response.status,
      data.code,
    );
  }
  return data as T;
}
export const post = <T>(path: string, data: unknown = {}) =>
  api<T>(path, { method: 'POST', body: JSON.stringify(data) });
export const patch = <T>(path: string, data: unknown) =>
  api<T>(path, { method: 'PATCH', body: JSON.stringify(data) });
export function useApi<T>(path: string) {
  const [result, setResult] = useState<{ path: string; value: T | null }>({ path, value: null });
  const data = result.path === path ? result.value : null;
  const setData = useCallback(
    (next: SetStateAction<T | null>) => {
      setResult((previous) => ({
        path,
        value:
          typeof next === 'function'
            ? (next as (value: T | null) => T | null)(
                previous.path === path ? previous.value : null,
              )
            : next,
      }));
    },
    [path],
  );
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const reload = useCallback(() => setTick((v) => v + 1), []);
  useEffect(() => {
    const ctrl = new AbortController();
    setLoading(true);
    setError('');
    api<T>(path, { signal: ctrl.signal })
      .then((value) => {
        if (!ctrl.signal.aborted) setData(value);
      })
      .catch((e) => {
        if (e.name !== 'AbortError') setError(e.message);
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setLoading(false);
      });
    return () => ctrl.abort();
  }, [path, tick, setData]);
  return { data, error, loading, reload, setData };
}
export const money = (value: number, currency = 'USD') =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 2 }).format(
    value / 100,
  );
export const date = (value: string | null, full = false) =>
  value
    ? (/^\d{4}-\d{2}-\d{2}$/.test(value)
        ? new Date(`${value}T00:00:00`)
        : new Date(value)
      ).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        ...(full ? { year: 'numeric' } : {}),
      })
    : 'Not set';
export const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : 'Something went wrong. Please try again.';
