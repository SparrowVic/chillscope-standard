import { linkedSignal, type Signal } from '@angular/core';
import type { HttpResourceRef } from '@angular/common/http';

interface Hold<T> {
  readonly pending: boolean;
  readonly value: T;
}

/** Keeps the previous value while a replacement loads. `value()` throws when the resource failed. */
export function heldValue<T>(resource: HttpResourceRef<T>, fallback: T): Signal<T> {
  return linkedSignal<Hold<T>, T>({
    source: () => ({
      pending: resource.isLoading() || resource.error() !== undefined,
      value: resource.hasValue() ? resource.value() : fallback,
    }),
    computation: (next, previous) =>
      next.pending && previous !== undefined ? previous.value : next.value,
  });
}
