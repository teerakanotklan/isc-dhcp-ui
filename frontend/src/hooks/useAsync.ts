import { useState, useCallback } from 'react';

/**
 * useAsync — wraps any async function with loading/error state.
 *
 * Usage:
 *   const { run, loading, error } = useAsync(myApiCall);
 *   await run(args...);
 */
export function useAsync<T, Args extends unknown[]>(
  fn: (...args: Args) => Promise<T>
) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(
    async (...args: Args): Promise<T | undefined> => {
      setLoading(true);
      setError(null);
      try {
        const result = await fn(...args);
        return result;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'An unexpected error occurred';
        setError(msg);
        return undefined;
      } finally {
        setLoading(false);
      }
    },
    [fn]
  );

  return { run, loading, error };
}
