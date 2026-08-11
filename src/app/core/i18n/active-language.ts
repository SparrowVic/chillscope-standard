import { computed, inject, type Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslocoService } from '@jsverse/transloco';

import { type AppLanguage, toAppLanguage } from './transloco.config';

/** Bridges Transloco's observable language into the signal graph. */
export function injectActiveLanguage(): Signal<AppLanguage> {
  const transloco = inject(TranslocoService);
  const lang = toSignal(transloco.langChanges$, { initialValue: transloco.getActiveLang() });
  return computed(() => toAppLanguage(lang()));
}
