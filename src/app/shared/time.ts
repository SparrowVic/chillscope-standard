export const MINUTE_MS = 60_000;
export const HOUR_MS = 60 * MINUTE_MS;
export const DAY_MS = 24 * HOUR_MS;

/** Measurement ranges are half-open: `[from, to)`. */
export interface TimeRange {
  readonly from: number;
  readonly to: number;
}

export type RangePresetId = 'lastHour' | 'last6Hours' | 'last24Hours' | 'last7Days' | 'last30Days';

export const RANGE_PRESET_SPANS: Readonly<Record<RangePresetId, number>> = {
  lastHour: HOUR_MS,
  last6Hours: 6 * HOUR_MS,
  last24Hours: 24 * HOUR_MS,
  last7Days: 7 * DAY_MS,
  last30Days: 30 * DAY_MS,
};

export const RANGE_PRESET_IDS: readonly RangePresetId[] = Object.keys(
  RANGE_PRESET_SPANS,
) as RangePresetId[];

export function rangePresetLabelKey(id: RangePresetId): string {
  return `range.preset.${id}`;
}

export function rangePresetShortLabelKey(id: RangePresetId): string {
  return `range.presetShort.${id}`;
}

/** `now` distinguishes a recent preset from a custom historical range with the same width. */
export function matchRangePreset(
  range: TimeRange,
  toleranceMs: number,
  now?: number,
): RangePresetId | undefined {
  if (now !== undefined && Math.abs(now - range.to) > toleranceMs) {
    return undefined;
  }
  const span = range.to - range.from;
  return RANGE_PRESET_IDS.find((id) => Math.abs(RANGE_PRESET_SPANS[id] - span) <= toleranceMs);
}

export function clampRangeStart(from: number, to: number, maxSpanMs: number): number {
  return Math.max(from, to - maxSpanMs);
}
