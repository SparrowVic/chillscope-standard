import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideTransloco, TranslocoTestingModule } from '@jsverse/transloco';
import { providePrimeNG } from 'primeng/config';
import { beforeEach, describe, expect, it } from 'vitest';

import { CsDateRange, type DateRange } from './date-range';

@Component({
  imports: [CsDateRange],
  template: `<cs-date-range label="range" [value]="range" />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class DateRangeHost {
  readonly range: DateRange = { from: null, to: null };
}

@Component({
  imports: [CsDateRange],
  template: `<cs-date-range label="range" dateFormat="m/d" [showTime]="true" [value]="range" />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class CompactDateRangeHost {
  readonly range: DateRange = {
    from: new Date(Date.UTC(2026, 7, 14, 18, 18)),
    to: new Date(Date.UTC(2026, 7, 15, 0, 18)),
  };
}

describe('CsDateRange', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideTransloco({ config: { availableLangs: ['en'], defaultLang: 'en' } }),
        providePrimeNG({}),
      ],
      imports: [TranslocoTestingModule],
    });
  });

  it('opens a mobile-safe picker without making the read-only field editable', async () => {
    const fixture = TestBed.createComponent(DateRangeHost);
    fixture.detectChanges();
    await fixture.whenStable();

    const input = (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>(
      '.p-datepicker-input',
    );

    expect(input?.readOnly).toBe(true);
    expect(input?.inputMode).toBe('none');
    expect(input?.autocomplete).toBe('off');

    input?.click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(document.body.querySelector('.cs-date-range-panel')).not.toBeNull();
  });

  it('keeps the full range available when the visible mobile format is compact', async () => {
    const fixture = TestBed.createComponent(CompactDateRangeHost);
    fixture.detectChanges();
    await fixture.whenStable();

    const input = (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>(
      '.p-datepicker-input',
    );

    expect(input?.value).not.toContain('2026');
    expect(input?.title).toContain('2026');
    expect(input?.getAttribute('aria-description')).toBe(input?.title);
  });
});
