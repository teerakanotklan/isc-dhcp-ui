import { useState, useEffect, useCallback } from 'react';

/**
 * useFetch — fetches data from a URL on mount (and whenever `url` changes).
 * Re-expose `refetch` to trigger a manual refresh.
 *
 * Usage:
 *   const { data, loading, error, refetch } = useFetch<Subnet[]>('/api/subnets');
 */
export function useFetch<T>(url: string, options?: RequestInit) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(url, options)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<{ success: boolean; data: T; message: string }>;
      })
      .then((body) => {
        if (!cancelled) {
          if (body.success) {
            setData(body.data);
          } else {
            setError(body.message ?? 'Request failed');
          }
        }
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, tick]);

  const refetch = useCallback(() => setTick((t) => t + 1), []);

  return { data, loading, error, refetch };
}
