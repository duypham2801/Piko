export type ListSnapshot<T> = {
  status: 'loading' | 'loaded' | 'error';
  items: readonly T[];
};

export type ListStore<T> = {
  subscribe: (listener: () => void) => () => void;
  getSnapshot: () => ListSnapshot<T>;
  invalidate: () => void;
  retry: () => void;
};

export function createListStore<T>(fetchList: () => Promise<T[]>): ListStore<T> {
  const listeners = new Set<() => void>();
  let snapshot: ListSnapshot<T> = { status: 'loading', items: [] };
  let needsFetch = true;
  let generation = 0;

  const emit = (nextSnapshot: ListSnapshot<T>) => {
    snapshot = nextSnapshot;
    listeners.forEach((listener) => listener());
  };

  const startFetch = (preserveLoaded: boolean) => {
    needsFetch = false;
    const requestGeneration = ++generation;

    if (!preserveLoaded && (snapshot.status !== 'loading' || snapshot.items.length > 0)) {
      emit({ status: 'loading', items: [] });
    }

    void Promise.resolve()
      .then(fetchList)
      .then((items) => {
        if (requestGeneration !== generation) {
          return;
        }

        emit({ status: 'loaded', items });
      })
      .catch(() => {
        if (requestGeneration !== generation) {
          return;
        }

        emit({ status: 'error', items: [] });
      });
  };

  const invalidate = () => {
    needsFetch = true;
    generation += 1;
    if (listeners.size > 0) {
      startFetch(snapshot.status === 'loaded');
    }
  };

  const retry = () => {
    needsFetch = true;
    generation += 1;
    if (listeners.size > 0) {
      startFetch(false);
    } else {
      emit({ status: 'loading', items: [] });
    }
  };

  const subscribe = (listener: () => void) => {
    listeners.add(listener);
    if (needsFetch) {
      startFetch(snapshot.status === 'loaded');
    }

    return () => listeners.delete(listener);
  };

  return {
    subscribe,
    getSnapshot: () => snapshot,
    invalidate,
    retry,
  };
}
