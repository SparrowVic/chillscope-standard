import { computed, DOCUMENT, effect, inject, Injectable, signal } from '@angular/core';

import { DEFAULT_LANGUAGE, isAppLanguage, type AppLanguage } from '../i18n/transloco.config';
import { clamp } from '../math';
import { openLocalStorage, readJson, writeJson } from '../storage';

export type ThemeMode = 'light' | 'dark';
export type LanguageCode = AppLanguage;

export interface Settings {
  readonly theme: ThemeMode;
  readonly language: LanguageCode;
  readonly liveIntervalMs: number;
}

export const DEFAULT_LIVE_INTERVAL_MS = 5_000;
export const LIVE_INTERVAL_MS_RANGE = { min: 1_000, max: 60_000 } as const;

const STORAGE_KEY = 'chillscope.settings';
const DARK_MODE_CLASS = 'app-dark';

@Injectable({ providedIn: 'root' })
export class SettingsStore {
  readonly #document = inject(DOCUMENT);
  readonly #storage = openLocalStorage(this.#document);
  readonly #restored = readSettings(this.#storage);
  readonly #theme = signal(this.#restored.theme ?? preferredTheme(this.#document));
  readonly #language = signal(this.#restored.language ?? DEFAULT_LANGUAGE);
  readonly #liveIntervalMs = signal(this.#restored.liveIntervalMs ?? DEFAULT_LIVE_INTERVAL_MS);
  readonly #persistenceFailed = signal(false);

  readonly theme = this.#theme.asReadonly();
  readonly language = this.#language.asReadonly();
  readonly liveIntervalMs = this.#liveIntervalMs.asReadonly();
  readonly persistenceFailed = this.#persistenceFailed.asReadonly();

  readonly #snapshot = computed<Settings>(() => ({
    theme: this.#theme(),
    language: this.#language(),
    liveIntervalMs: this.#liveIntervalMs(),
  }));

  constructor() {
    effect(() => {
      const root = this.#document.documentElement;
      root.classList.toggle(DARK_MODE_CLASS, this.#theme() === 'dark');
      root.style.background = '';
      const canvas = this.#document.defaultView
        ?.getComputedStyle(root)
        .getPropertyValue('--cs-canvas')
        .trim();
      const themeColor = this.#document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
      if (themeColor && canvas) {
        themeColor.content = canvas;
      }
    });

    this.#persist();
  }

  setTheme(theme: ThemeMode): void {
    this.#theme.set(theme);
    this.#persist();
  }

  setLanguage(language: LanguageCode): void {
    this.#language.set(language);
    this.#persist();
  }

  setLiveIntervalMs(intervalMs: number): void {
    this.#liveIntervalMs.set(clampLiveInterval(intervalMs));
    this.#persist();
  }

  reset(): void {
    this.#theme.set(preferredTheme(this.#document));
    this.#language.set(DEFAULT_LANGUAGE);
    this.#liveIntervalMs.set(DEFAULT_LIVE_INTERVAL_MS);
    this.#persist();
  }

  #persist(): void {
    this.#persistenceFailed.set(!writeJson(this.#storage, STORAGE_KEY, this.#snapshot()));
  }
}

function preferredTheme(document: Document): ThemeMode {
  const view = document.defaultView;
  if (typeof view?.matchMedia !== 'function') {
    return 'light';
  }
  return view.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function readSettings(storage: Storage | undefined): Partial<Settings> {
  const value = readJson(storage, STORAGE_KEY);
  if (typeof value !== 'object' || value === null) {
    return {};
  }
  const raw = value as Record<string, unknown>;
  return {
    theme: raw['theme'] === 'dark' || raw['theme'] === 'light' ? raw['theme'] : undefined,
    language: isAppLanguage(raw['language']) ? raw['language'] : undefined,
    liveIntervalMs:
      typeof raw['liveIntervalMs'] === 'number' && Number.isFinite(raw['liveIntervalMs'])
        ? clampLiveInterval(raw['liveIntervalMs'])
        : undefined,
  };
}

function clampLiveInterval(intervalMs: number): number {
  if (!Number.isFinite(intervalMs)) {
    return DEFAULT_LIVE_INTERVAL_MS;
  }
  return clamp(Math.round(intervalMs), LIVE_INTERVAL_MS_RANGE.min, LIVE_INTERVAL_MS_RANGE.max);
}
