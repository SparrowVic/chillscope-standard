import { linkedSignal, type Signal } from '@angular/core';

export interface NonEmptySelection<T> {
  readonly picked: Signal<T[]>;
  commit(next: T[]): T[] | undefined;
}

/** Reject empty selections and publish a fresh array so PrimeNG restores the previous value. */
export function nonEmptySelection<T>(source: Signal<readonly T[]>): NonEmptySelection<T> {
  const picked = linkedSignal<readonly T[], T[]>({
    source,
    computation: (values) => [...values],
  });

  return {
    picked,
    commit(next: T[]): T[] | undefined {
      if (next.length === 0) {
        picked.set([...source()]);
        return undefined;
      }
      picked.set(next);
      return next;
    },
  };
}
