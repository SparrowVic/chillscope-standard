import { max, min, required, schema } from '@angular/forms/signals';

import { LIVE_INTERVAL_MS_RANGE } from '../../core/settings/settings.store';

export interface SettingsFormValue {
  readonly liveIntervalMs: number | null;
}

export function toFormValue(liveIntervalMs: number): SettingsFormValue {
  return { liveIntervalMs };
}

export function toLiveInterval(value: SettingsFormValue): number | undefined {
  return value.liveIntervalMs ?? undefined;
}

export const settingsFormSchema = schema<SettingsFormValue>((settings) => {
  required(settings.liveIntervalMs);
  min(settings.liveIntervalMs, LIVE_INTERVAL_MS_RANGE.min);
  max(settings.liveIntervalMs, LIVE_INTERVAL_MS_RANGE.max);
});
