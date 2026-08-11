import type { EnvironmentProviders, Provider } from '@angular/core';
import { TRANSLOCO_LOADER, type Translation, type TranslocoLoader } from '@jsverse/transloco';
import { of } from 'rxjs';

import { provideAppTransloco } from '../core/i18n/transloco.config';

export type TestCatalogue = Translation | ((language: string) => Translation);

export function provideTestTransloco(
  catalogue: TestCatalogue = {},
): (Provider | EnvironmentProviders)[] {
  const resolve = typeof catalogue === 'function' ? catalogue : () => catalogue;
  const loader: TranslocoLoader = { getTranslation: (language: string) => of(resolve(language)) };

  return [provideAppTransloco(), { provide: TRANSLOCO_LOADER, useValue: loader }];
}
