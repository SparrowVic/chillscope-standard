import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { HeatmapLabels, HeatmapMatrix } from '@chillscope/chart/types';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { CycleFacade } from '../../../core/data/cycle.facade';
import { MeasurementsFacade } from '../../../core/data/measurements.facade';
import { SERIES_CATALOG } from '../../../core/data/series.catalog';
import { provideTestTransloco } from '../../../testing/transloco';
import type { CyclePanel as CyclePanelClass } from './cycle-panel';

const TRANSLATIONS: Readonly<Record<string, string>> = {
  'dashboard.cycle.title': 'Rytm dobowy',
  'dashboard.cycle.hint': 'Średnie godzinowe',
  'dashboard.cycle.seriesLabel': 'Seria',
  'dashboard.cycle.rangeLabel': 'Okno',
  'dashboard.cycle.days7': '7 dni',
  'dashboard.cycle.days14': '14 dni',
  'dashboard.cycle.days30': '30 dni',
  'dashboard.cycle.ariaLabel': 'Mapa rytmu dobowego pomiarów',
  'chart.empty': 'Brak danych',
  'chart.loading': 'Wczytywanie…',
  'common.retry': 'Spróbuj ponownie',
  'errors.generic': 'Wystąpił nieoczekiwany błąd.',
  'errors.loadMeasurements': 'Nie udało się pobrać pomiarów.',
  'series.temperature': 'Temperatura',
  'series.pressure': 'Ciśnienie',
  'series.flow': 'Przepływ',
  'series.rpm': 'Obroty',
  'units.celsius': '°C',
  'units.bar': 'bar',
  'units.litersPerMinute': 'l/min',
  'units.rpm': 'obr/min',
};

const DAYS = [Date.UTC(2026, 7, 12), Date.UTC(2026, 7, 13)] as const;
const VALUES = Array.from({ length: DAYS.length * 24 }, (_, hour) => 58 + hour / 10);

let CyclePanel: typeof CyclePanelClass;
const cycleError = signal<unknown>(undefined);
const cycleLoading = signal(false);
const reloadCycle = vi.fn();

beforeAll(async () => {
  const tag = 'chillscope-cycle-heatmap';
  if (!customElements.get(tag)) {
    customElements.define(tag, class extends HTMLElement {});
  }
  ({ CyclePanel } = await import('./cycle-panel'));
});

describe('CyclePanel', () => {
  beforeEach(() => {
    cycleError.set(undefined);
    cycleLoading.set(false);
    reloadCycle.mockReset();

    TestBed.configureTestingModule({
      providers: [
        ...provideTestTransloco(TRANSLATIONS),
        {
          provide: CycleFacade,
          useValue: {
            seriesId: signal('temperature'),
            days: signal(14),
            fold: signal({ days: DAYS, values: VALUES }),
            error: cycleError,
            isLoading: cycleLoading,
            isInitialLoading: signal(false),
            setSeries: () => undefined,
            setDays: () => undefined,
            reload: reloadCycle,
          },
        },
        {
          provide: MeasurementsFacade,
          useValue: { catalogue: signal([SERIES_CATALOG.temperature]) },
        },
      ],
    });
  });

  it('joins the selected series metadata with the day-by-hour fold at the Vue boundary', () => {
    const fixture = TestBed.createComponent(CyclePanel);
    fixture.componentRef.setInput('theme', 'dark');
    fixture.detectChanges();

    const element = (fixture.nativeElement as HTMLElement).querySelector(
      'chillscope-cycle-heatmap',
    ) as
      | (HTMLElement & {
          matrix?: HeatmapMatrix;
          labels?: HeatmapLabels;
          locale?: string;
          theme?: string;
          loading?: boolean;
        })
      | null;

    expect(element?.matrix).toEqual({
      days: DAYS,
      values: VALUES,
      label: 'Temperatura',
      unit: '°C',
      color: SERIES_CATALOG.temperature.color,
    });
    expect(element?.labels).toEqual({
      empty: 'Brak danych',
      loading: 'Wczytywanie…',
      ariaLabel: 'Mapa rytmu dobowego pomiarów',
    });
    expect(element?.locale).toBe('pl');
    expect(element?.theme).toBe('dark');
    expect(element?.loading).toBe(false);
  });

  it('replaces a failed heatmap with a retryable error state', () => {
    cycleError.set(new Error('cycle unavailable'));
    const fixture = TestBed.createComponent(CyclePanel);
    fixture.componentRef.setInput('theme', 'light');
    fixture.detectChanges();

    const panel = fixture.nativeElement as HTMLElement;
    expect(panel.querySelector('chillscope-cycle-heatmap')).toBeNull();
    expect(panel.textContent).toContain('Nie udało się pobrać pomiarów.');
    expect(panel.textContent).toContain('Wystąpił nieoczekiwany błąd.');

    panel.querySelector<HTMLButtonElement>('app-error-panel button')?.click();

    expect(reloadCycle).toHaveBeenCalledOnce();
  });
});
