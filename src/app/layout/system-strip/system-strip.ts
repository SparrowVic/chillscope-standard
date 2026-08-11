import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { filter, map } from 'rxjs';

import { MeasurementsFacade } from '../../core/data/measurements.facade';
import { injectActiveLanguage } from '../../core/i18n/active-language';
import { SettingsStore } from '../../core/settings/settings.store';
import { injectClock } from '../../shared/clock';
import { CsIcon } from '../../shared/icons/cs-icon/cs-icon';
import { CsDigitMorph } from '../../shared/motion/digit-morph/digit-morph';
import { LanguageSwitch } from '../language-switch/language-switch';
import { ThemeSwitch } from '../theme-switch/theme-switch';

@Component({
  selector: 'app-system-strip',
  imports: [RouterLink, TranslocoPipe, CsIcon, CsDigitMorph, ThemeSwitch, LanguageSwitch],
  templateUrl: './system-strip.html',
  styleUrl: './system-strip.css',
  host: {
    role: 'banner',
    '[class.strip--docked]': 'docked()',
    '[class.strip--has-message]': 'settingsPersistenceFailed()',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SystemStrip {
  readonly #measurements = inject(MeasurementsFacade);
  readonly #settings = inject(SettingsStore);
  readonly #router = inject(Router);
  readonly #language = injectActiveLanguage();
  readonly #now = injectClock(1_000);

  protected readonly live = this.#measurements.liveEnabled;
  protected readonly settingsPersistenceFailed = this.#settings.persistenceFailed;

  readonly #url = toSignal(
    this.#router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map(() => this.#router.url),
    ),
    { initialValue: this.#router.url },
  );

  protected readonly docked = computed(() => this.#url().startsWith('/dashboard'));

  readonly #timeFormat = computed(
    () =>
      new Intl.DateTimeFormat(this.#language(), {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }),
  );

  protected readonly clockText = computed(() => this.#timeFormat().format(this.#now()));
  protected readonly clockDateTime = computed(() => new Date(this.#now()).toISOString());
}
