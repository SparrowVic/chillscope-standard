import { computed, inject, type Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslocoService } from '@jsverse/transloco';

export interface SelectOption<T> {
  readonly value: T;
  readonly label: string;
  readonly disabled?: boolean;
}

export interface TranslatedSelectOption<T> extends SelectOption<T> {
  readonly text: string;
}

/** Wait for the catalogue before giving translated option objects to PrimeNG. */
export function translateOptions<T>(
  options: Signal<readonly SelectOption<T>[]>,
): Signal<TranslatedSelectOption<T>[]> {
  const transloco = inject(TranslocoService);
  const translation = toSignal(transloco.selectTranslation());

  return computed(() => {
    const loaded = translation() !== undefined;
    return options().map((option) => ({
      ...option,
      text: loaded ? transloco.translate<string>(option.label) : option.label,
    }));
  });
}
