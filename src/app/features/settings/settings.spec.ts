import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { providePrimeNG } from 'primeng/config';
import { beforeEach, describe, expect, it } from 'vitest';

import { CsInputNumber } from '../../shared/controls/input-number/input-number';
import { CsSlider } from '../../shared/controls/slider/slider';
import { provideTestTransloco } from '../../testing/transloco';
import { Settings } from './settings';
import { SimulationFields } from './simulation-fields/simulation-fields';

describe('Settings', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        ...provideTestTransloco({
          'settings.actions.unsaved': 'Unsaved changes',
          'settings.actions.blocked': 'Fix the highlighted fields to save',
        }),
        providePrimeNG({}),
      ],
    });
  });

  it('keeps one focused simulation setting and no extended configuration groups', () => {
    const fixture = TestBed.createComponent(Settings);
    fixture.detectChanges();

    expect(fixture.debugElement.queryAll(By.directive(SimulationFields))).toHaveLength(1);
    expect(fixture.debugElement.queryAll(By.directive(CsInputNumber))).toHaveLength(1);
    expect(fixture.debugElement.queryAll(By.directive(CsSlider))).toHaveLength(1);
  });

  it('marks a slider edit dirty and enables saving', () => {
    const fixture = TestBed.createComponent(Settings);
    fixture.detectChanges();
    const slider = fixture.debugElement.query(By.directive(CsSlider)).componentInstance as CsSlider;

    slider.value.set(2_000);
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Unsaved changes');
    expect(
      (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>(
        'p-button[type="submit"] button',
      )?.disabled,
    ).toBe(false);
  });
});
