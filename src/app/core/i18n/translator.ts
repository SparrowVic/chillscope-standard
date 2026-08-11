import { computed, inject, type Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslocoService } from '@jsverse/transloco';

/** Provides translated text to consumers that cannot use a Transloco pipe. */
export function injectTranslator(): Signal<(key: string) => string> {
  const transloco = inject(TranslocoService);
  const translation = toSignal(transloco.selectTranslation());

  return computed(() => {
    const loaded = translation() !== undefined;
    return (key: string) => (loaded ? transloco.translate<string>(key) : key);
  });
}
