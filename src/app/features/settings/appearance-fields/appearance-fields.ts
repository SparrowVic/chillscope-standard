import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { SettingsStore, type ThemeMode } from '../../../core/settings/settings.store';
import type { AppLanguage } from '../../../core/i18n/transloco.config';
import { CsSelect } from '../../../shared/controls/select/select';
import type { SelectOption } from '../../../shared/controls/select-option';

@Component({
  selector: 'app-appearance-fields',
  imports: [CsSelect],
  templateUrl: './appearance-fields.html',
  styleUrl: './appearance-fields.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppearanceFields {
  readonly #settings = inject(SettingsStore);

  protected readonly language = this.#settings.language;
  protected readonly theme = this.#settings.theme;

  protected readonly languageOptions: readonly SelectOption<AppLanguage>[] = [
    { value: 'pl', label: 'language.pl' },
    { value: 'en', label: 'language.en' },
  ];

  protected readonly themeOptions: readonly SelectOption<ThemeMode>[] = [
    { value: 'light', label: 'theme.light' },
    { value: 'dark', label: 'theme.dark' },
  ];

  protected setLanguage(language: AppLanguage): void {
    this.#settings.setLanguage(language);
  }

  protected setTheme(theme: ThemeMode): void {
    this.#settings.setTheme(theme);
  }
}
