import { describe, expect, it } from 'vitest';
import { DAY_MS, clampRangeStart } from './time';

describe('clampRangeStart', () => {
  it('keeps a midnight-snapped range within the exact backend budget', () => {
    const to = new Date(2026, 7, 5, 15).getTime();
    const max = 30 * DAY_MS;
    const snappedDay = new Date(to - max);
    snappedDay.setHours(0, 0, 0, 0);
    const snapped = snappedDay.getTime();

    expect(to - snapped).toBeGreaterThan(max);
    expect(to - clampRangeStart(snapped, to, max)).toBe(max);
  });

  it('leaves a narrower range untouched', () => {
    expect(clampRangeStart(500, 1_000, 1_000)).toBe(500);
  });
});
