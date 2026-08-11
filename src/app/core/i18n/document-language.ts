import {
  DOCUMENT,
  effect,
  inject,
  makeEnvironmentProviders,
  provideAppInitializer,
  type EnvironmentProviders,
} from '@angular/core';

import { injectActiveLanguage } from './active-language';

/** Keep `<html lang>` aligned with the rendered language for assistive technology. */
export function provideDocumentLanguage(): EnvironmentProviders {
  return makeEnvironmentProviders([
    provideAppInitializer(() => {
      const documentRef = inject(DOCUMENT);
      const language = injectActiveLanguage();

      effect(() => {
        documentRef.documentElement.lang = language();
      });
    }),
  ]);
}
