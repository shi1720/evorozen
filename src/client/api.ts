import { useCallback, useEffect, useState } from 'react';
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
  const data = await response
    .json()
    .catch(() => ({ error: 'The server returned an unexpected response. Please try again.' }));
  if (!response.ok)
    throw new RequestError(
      data.error || 'Something went wrong. Please try again.',
      response.status,
      data.code,
    );
  return data as T;
}
export const post = <T>(path: string, data: unknown = {}) =>
  api<T>(path, { method: 'POST', body: JSON.stringify(data) });
export const patch = <T>(path: string, data: unknown) =>
  api<T>(path, { method: 'PATCH', body: JSON.stringify(data) });
export function useApi<T>(path: string) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const reload = useCallback(() => setTick((v) => v + 1), []);
  useEffect(() => {
    const ctrl = new AbortController();
    setLoading(true);
    setError('');
    api<T>(path, { signal: ctrl.signal })
      .then(setData)
      .catch((e) => {
        if (e.name !== 'AbortError') setError(e.message);
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setLoading(false);
      });
    return () => ctrl.abort();
  }, [path, tick]);
  return { data, error, loading, reload, setData };
}
export const money = (value: number, currency = 'USD') =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 2 }).format(
    value / 100,
  );
export const date = (value: string | null, full = false) =>
  value
    ? new Date(value).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        ...(full ? { year: 'numeric' } : {}),
      })
    : '—';
export const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : 'Something went wrong. Please try again.';
