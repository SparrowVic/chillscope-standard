import { DOCUMENT } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_LIVE_INTERVAL_MS, LIVE_INTERVAL_MS_RANGE, SettingsStore } from './settings.store';

const STORAGE_KEY = 'chillscope.settings';

describe('SettingsStore', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.className = '';
    document.documentElement.removeAttribute('style');
    document.head.querySelector('meta[name="theme-color"]')?.remove();
    const meta = document.createElement('meta');
    meta.name = 'theme-color';
    document.head.append(meta);
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
  });

  it('removes the bootstrap background and follows the selected theme in browser chrome', () => {
    const documentRef = TestBed.inject(DOCUMENT);
    documentRef.documentElement.style.background = 'rgb(12, 13, 15)';
    documentRef.documentElement.style.setProperty('--cs-canvas', 'rgb(244, 245, 247)');
    const store = TestBed.inject(SettingsStore);
    TestBed.tick();

    expect(documentRef.documentElement.style.background).toBe('');
    expect(documentRef.querySelector('meta[name="theme-color"]')?.getAttribute('content')).toBe(
      'rgb(244, 245, 247)',
    );

    documentRef.documentElement.style.setProperty('--cs-canvas', 'rgb(12, 13, 15)');
    store.setTheme('dark');
    TestBed.tick();
    expect(documentRef.documentElement.classList.contains('app-dark')).toBe(true);
    expect(documentRef.querySelector('meta[name="theme-color"]')?.getAttribute('content')).toBe(
      'rgb(12, 13, 15)',
    );
  });

  it('restores theme, language and live interval from one persisted snapshot', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ theme: 'dark', language: 'en', liveIntervalMs: 12_000 }),
    );

    const store = TestBed.inject(SettingsStore);

    expect(store.theme()).toBe('dark');
    expect(store.language()).toBe('en');
    expect(store.liveIntervalMs()).toBe(12_000);
  });

  it('persists the complete supported settings snapshot', () => {
    const store = TestBed.inject(SettingsStore);

    store.setTheme('dark');
    store.setLanguage('en');
    store.setLiveIntervalMs(8_500);

    expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')).toEqual({
      theme: 'dark',
      language: 'en',
      liveIntervalMs: 8_500,
    });
  });

  it('normalises invalid and out-of-range live intervals before persisting them', () => {
    const store = TestBed.inject(SettingsStore);

    store.setLiveIntervalMs(Number.NaN);
    expect(store.liveIntervalMs()).toBe(DEFAULT_LIVE_INTERVAL_MS);

    store.setLiveIntervalMs(1);
    expect(store.liveIntervalMs()).toBe(LIVE_INTERVAL_MS_RANGE.min);

    store.setLiveIntervalMs(Number.MAX_SAFE_INTEGER);
    expect(store.liveIntervalMs()).toBe(LIVE_INTERVAL_MS_RANGE.max);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')).toMatchObject({
      liveIntervalMs: LIVE_INTERVAL_MS_RANGE.max,
    });
  });

  it('ignores unsupported persisted values without poisoning the restored state', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ theme: 'sepia', language: 'de', liveIntervalMs: 'fast' }),
    );

    const store = TestBed.inject(SettingsStore);

    expect(['light', 'dark']).toContain(store.theme());
    expect(store.language()).toBe('pl');
    expect(store.liveIntervalMs()).toBe(DEFAULT_LIVE_INTERVAL_MS);
  });

  it('exposes a failed browser-storage write instead of claiming persistence', () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Storage blocked');
    });
    try {
      expect(TestBed.inject(SettingsStore).persistenceFailed()).toBe(true);
    } finally {
      setItem.mockRestore();
    }
  });
});
