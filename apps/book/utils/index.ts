import { useRouter } from 'next/router';
import { useMemo } from 'react';

const caches: Record<string, unknown> = {};

export function useCache<T>() {
  const { pathname } = useRouter();

  return useMemo(() => {
    const cache = {
      get() {
        return caches[pathname] as T | undefined;
      },
      save(data: T) {
        caches[pathname] = data;
      },
    };

    return cache;
  }, [pathname]);
}
