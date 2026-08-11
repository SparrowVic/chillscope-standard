import { computed, DestroyRef, Injectable, inject, signal, type Signal } from '@angular/core';

export type FilterShellMode = 'inline' | 'drawer' | 'sheet';

const SHEET_QUERY = '(max-width: 640px)';
const DRAWER_QUERY = '(max-width: 1024px)';

function mediaSignal(query: string, destroyRef: DestroyRef): Signal<boolean> {
  const view = typeof window === 'undefined' ? undefined : window;
  // jsdom and SSR may not provide matchMedia.
  if (view === undefined || typeof view.matchMedia !== 'function') {
    return signal(false).asReadonly();
  }
  const list = view.matchMedia(query);
  const matches = signal(list.matches);
  const onChange = (event: MediaQueryListEvent): void => matches.set(event.matches);
  list.addEventListener('change', onChange);
  destroyRef.onDestroy(() => list.removeEventListener('change', onChange));
  return matches.asReadonly();
}

@Injectable({ providedIn: 'root' })
export class FilterLayout {
  readonly #destroyRef = inject(DestroyRef);
  readonly #sheet = mediaSignal(SHEET_QUERY, this.#destroyRef);
  readonly #drawer = mediaSignal(DRAWER_QUERY, this.#destroyRef);

  readonly mode: Signal<FilterShellMode> = computed(() =>
    this.#sheet() ? 'sheet' : this.#drawer() ? 'drawer' : 'inline',
  );
}
