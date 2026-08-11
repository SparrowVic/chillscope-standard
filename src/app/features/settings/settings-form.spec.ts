import { Injector, runInInjectionContext, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { form } from '@angular/forms/signals';
import { beforeEach, describe, expect, it } from 'vitest';

import {
  settingsFormSchema,
  toFormValue,
  toLiveInterval,
  type SettingsFormValue,
} from './settings-form';

function errorKinds(value: SettingsFormValue): string[] {
  const injector = TestBed.inject(Injector);
  return runInInjectionContext(injector, () =>
    form(signal(value), settingsFormSchema)
      .liveIntervalMs()
      .errors()
      .map((error) => error.kind),
  );
}

describe('settings form', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('maps the stored interval into the form and back', () => {
    const value = toFormValue(5_000);
    expect(value).toEqual({ liveIntervalMs: 5_000 });
    expect(toLiveInterval(value)).toBe(5_000);
  });

  it('does not map a cleared interval', () => {
    expect(toLiveInterval({ liveIntervalMs: null })).toBeUndefined();
  });

  it('requires an interval inside the supported range', () => {
    expect(errorKinds({ liveIntervalMs: null })).toContain('required');
    expect(errorKinds({ liveIntervalMs: 500 })).toContain('min');
    expect(errorKinds({ liveIntervalMs: 60_500 })).toContain('max');
    expect(errorKinds({ liveIntervalMs: 5_000 })).toEqual([]);
  });
});
