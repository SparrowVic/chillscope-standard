import { DOCUMENT } from '@angular/common';
import { DestroyRef, inject, type Signal, signal } from '@angular/core';

/** Keeps long-running views current and pauses updates while the document is hidden. */
export function injectClock(intervalMs: number): Signal<number> {
  const now = signal(Date.now());
  const document = inject(DOCUMENT);
  let handle: ReturnType<typeof setInterval> | undefined;

  const stop = (): void => {
    if (handle !== undefined) {
      clearInterval(handle);
      handle = undefined;
    }
  };
  const start = (): void => {
    if (handle === undefined) {
      handle = setInterval(() => now.set(Date.now()), intervalMs);
    }
  };
  const onVisibility = (): void => {
    if (document.hidden) {
      stop();
      return;
    }
    now.set(Date.now());
    start();
  };

  if (!document.hidden) {
    start();
  }
  document.addEventListener('visibilitychange', onVisibility);
  inject(DestroyRef).onDestroy(() => {
    stop();
    document.removeEventListener('visibilitychange', onVisibility);
  });
  return now.asReadonly();
}
