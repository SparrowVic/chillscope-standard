import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { providePrimeNG } from 'primeng/config';
import { DatePicker } from 'primeng/datepicker';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { provideTestTransloco } from '../../../testing/transloco';
import { HOUR_MS } from '../../../shared/time';
import { RangePicker } from './range-picker';

describe('RangePicker', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({
      providers: [
        ...provideTestTransloco({
      'range.label': 'Range',
      'range.preset.lastHour': 'Last hour',
      'range.presetShort.lastHour': '1 h',
    }),
        providePrimeNG({}),
      ],
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('uses the click time rather than the coarse display clock for a preset', () => {
    const openedAt = Date.UTC(2026, 7, 5, 12);
    vi.setSystemTime(openedAt);
    const fixture = TestBed.createComponent(RangePicker);
    fixture.componentRef.setInput('range', { from: openedAt - HOUR_MS, to: openedAt });
    fixture.componentRef.setInput('bucket', 'raw');
    fixture.detectChanges();
    vi.setSystemTime(openedAt + 30_000);
    const emitted = vi.fn();
    fixture.componentRef.instance.rangeChange.subscribe(emitted);
    const element = fixture.nativeElement as HTMLElement;

    element.querySelector<HTMLButtonElement>('.cs-segmented-control__option')?.click();

    expect(emitted).toHaveBeenCalledWith({
      from: openedAt + 30_000 - HOUR_MS,
      to: openedAt + 30_000,
    });
  });

  it('renders a legible tabular date range with a typographic separator', () => {
    const openedAt = Date.UTC(2026, 7, 5, 12);
    vi.setSystemTime(openedAt);
    const fixture = TestBed.createComponent(RangePicker);
    fixture.componentRef.setInput('range', { from: openedAt - HOUR_MS, to: openedAt });
    fixture.componentRef.setInput('bucket', 'raw');
    fixture.detectChanges();

    const input = (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>(
      '.p-datepicker-input',
    );
    const datePicker = fixture.debugElement.query(By.directive(DatePicker))
      .componentInstance as DatePicker;

    expect(input?.classList.contains('cs-mono')).toBe(true);
    expect(datePicker.rangeSeparator).toBe('–');
  });
});
