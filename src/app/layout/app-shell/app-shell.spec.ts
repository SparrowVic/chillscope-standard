import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';

import pl from '../../../assets/i18n/pl.json';
import { MeasurementsFacade } from '../../core/data/measurements.facade';
import { SettingsStore } from '../../core/settings/settings.store';
import { provideTestTransloco } from '../../testing/transloco';
import { AppShell } from './app-shell';

const live = signal(false);
const persistenceFailed = signal(false);
const theme = signal<'light' | 'dark'>('light');
const language = signal<'pl' | 'en'>('pl');

@Component({
  template: '',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class EmptyRoute {}

function renderFixture() {
  const fixture = TestBed.createComponent(AppShell);
  fixture.detectChanges();
  return fixture;
}

describe('AppShell', () => {
  beforeEach(() => {
    live.set(false);
    persistenceFailed.set(false);
    theme.set('light');
    language.set('pl');

    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'dashboard', component: EmptyRoute },
          { path: 'settings', component: EmptyRoute },
        ]),
        ...provideTestTransloco(pl),
        {
          provide: MeasurementsFacade,
          useValue: { liveEnabled: live.asReadonly() },
        },
        {
          provide: SettingsStore,
          useValue: {
            persistenceFailed: persistenceFailed.asReadonly(),
            theme: theme.asReadonly(),
            language: language.asReadonly(),
            setTheme: (value: 'light' | 'dark') => theme.set(value),
            setLanguage: (value: 'pl' | 'en') => language.set(value),
          },
        },
      ],
    });
  });

  it('renders one labelled navigation with the two retained destinations', () => {
    const shell = renderFixture().nativeElement as HTMLElement;
    const nav = shell.querySelector('nav');

    expect(shell.querySelectorAll('nav')).toHaveLength(1);
    expect(nav?.getAttribute('aria-label')).toBe('Menu główne');
    expect(
      [...(nav?.querySelectorAll('.navigation__item') ?? [])].map((item) =>
        item.getAttribute('aria-label'),
      ),
    ).toEqual(['Pulpit', 'Ustawienia']);
  });

  it('marks the current destination for sighted and assistive-technology users', async () => {
    const fixture = renderFixture();
    const router = TestBed.inject(Router);

    await router.navigateByUrl('/settings');
    fixture.detectChanges();

    const active = (fixture.nativeElement as HTMLElement).querySelector<HTMLAnchorElement>(
      '.navigation__item--active',
    );
    expect(active?.getAttribute('href')).toBe('/settings');
    expect(active?.getAttribute('aria-current')).toBe('page');
  });

  it('keeps the skip link connected to the main landmark', () => {
    const shell = renderFixture().nativeElement as HTMLElement;
    const skip = shell.querySelector<HTMLAnchorElement>('.skip-link');

    expect(skip?.textContent?.trim()).toBe('Przejdź do treści');
    expect(skip?.getAttribute('href')).toBe('#main-content');
    expect(shell.querySelector('main#main-content')).not.toBeNull();
  });

  it('shows the retained LIVE, clock and preference controls in the system strip', () => {
    const shell = renderFixture().nativeElement as HTMLElement;

    expect(shell.querySelector('app-system-strip')?.classList.contains('strip--has-message')).toBe(
      false,
    );
    expect(shell.querySelector('.strip__telemetry')).not.toBeNull();
    expect(shell.querySelector('.strip__controls')).not.toBeNull();

    const liveIndicator = shell.querySelector('.live');
    expect(liveIndicator?.classList.contains('live--on')).toBe(false);
    expect(liveIndicator?.querySelector('.sr-only')?.textContent?.trim()).toBe(
      'Podgląd na żywo wyłączony',
    );

    const clock = shell.querySelector<HTMLTimeElement>('time.clock');
    expect(clock?.getAttribute('aria-label')).toBe('Aktualny czas');
    expect(clock?.dateTime).toMatch(/^\d{4}-/);
  });

  it('announces a settings persistence failure', () => {
    persistenceFailed.set(true);
    const shell = renderFixture().nativeElement as HTMLElement;

    expect(shell.querySelector('app-system-strip')?.classList.contains('strip--has-message')).toBe(
      true,
    );
    expect(shell.querySelector('.settings-persistence-error')?.getAttribute('role')).toBe('alert');
  });
});
