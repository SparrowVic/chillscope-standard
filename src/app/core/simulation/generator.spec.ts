import { describe, expect, it } from 'vitest';
import { BUCKET_MS, MAX_POINTS } from '../data/series.catalog';
import { generateSeries } from './generator';

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const START = Date.UTC(2026, 0, 1);
const UNALIGNED_START = START + 17 * MINUTE + 33_412;
const SEED = 1337;

describe('generateSeries', () => {
  it('returns one entry per requested series, in the requested order', () => {
    const result = generateSeries(
      { from: START, to: START + HOUR, series: ['pressure', 'temperature'] },
      SEED,
    );
    expect(result.map((entry) => entry.id)).toEqual(['pressure', 'temperature']);
  });

  it('returns identical output for identical input', () => {
    const request = { from: START, to: START + 6 * HOUR, series: ['temperature'] } as const;
    expect(generateSeries(request, SEED)).toEqual(generateSeries(request, SEED));
  });

  it('returns different output for a different seed', () => {
    const request = { from: START, to: START + 6 * HOUR, series: ['temperature'] } as const;
    expect(generateSeries(request, SEED)).not.toEqual(generateSeries(request, SEED + 1));
  });

  it('keeps timestamps and values the same length and ascending', () => {
    const [series] = generateSeries(
      { from: START, to: START + DAY, series: ['temperature'] },
      SEED,
    );
    expect(series.t.length).toBe(series.v.length);
    expect(series.t.length).toBeGreaterThan(0);
    for (let i = 1; i < series.t.length; i++) {
      expect(series.t[i]).toBeGreaterThan(series.t[i - 1]);
    }
  });

  it('stays inside the requested range', () => {
    const [series] = generateSeries({ from: START, to: START + 3 * HOUR, series: ['flow'] }, SEED);
    expect(series.t[0]).toBeGreaterThanOrEqual(START);
    expect(series.t.at(-1)).toBeLessThan(START + 3 * HOUR);
  });

  it('emits only whole buckets that fit inside an unaligned range', () => {
    const to = UNALIGNED_START + 3 * DAY;
    const [series] = generateSeries(
      { from: UNALIGNED_START, to, series: ['temperature'], bucket: '1h' },
      SEED,
    );
    expect(series.t.length).toBeGreaterThan(0);
    expect(series.t[0]).toBeGreaterThanOrEqual(UNALIGNED_START);
    expect((series.t.at(-1) ?? 0) + BUCKET_MS['1h']).toBeLessThanOrEqual(to);
  });

  it('keeps a single partial bucket when the range is narrower than the bucket', () => {
    const [series] = generateSeries(
      { from: UNALIGNED_START, to: UNALIGNED_START + HOUR, series: ['temperature'], bucket: '6h' },
      SEED,
    );
    expect(series.t).toHaveLength(1);
  });

  it('keeps only the visible partial bucket when a short range crosses a bucket boundary', () => {
    const from = START + 54 * MINUTE;
    const [series] = generateSeries(
      { from, to: from + 10 * MINUTE, series: ['temperature'], bucket: '1h' },
      SEED,
    );

    expect(series.t).toEqual([START + HOUR]);
    expect(series.v).toHaveLength(1);
  });

  it('caps the point count even for a year-long range', () => {
    const [series] = generateSeries(
      { from: START, to: START + 365 * DAY, series: ['temperature'] },
      SEED,
    );
    expect(series.t.length).toBeLessThanOrEqual(MAX_POINTS);
  });

  it('widens a bucket the client asked for but the range cannot afford', () => {
    const [series] = generateSeries(
      { from: START, to: START + 30 * DAY, series: ['temperature'], bucket: 'raw' },
      SEED,
    );
    expect(series.t.length).toBeLessThanOrEqual(MAX_POINTS);
  });

  it('honours an explicitly requested bucket', () => {
    const [series] = generateSeries(
      { from: START, to: START + DAY, series: ['temperature'], bucket: '1h' },
      SEED,
    );
    expect(series.t.length).toBe(24);
    expect(series.t[1] - series.t[0]).toBe(HOUR);
  });

  it('returns empty series when the range is inverted', () => {
    const [series] = generateSeries(
      { from: START + HOUR, to: START, series: ['temperature'] },
      SEED,
    );
    expect(series.t).toEqual([]);
    expect(series.v).toEqual([]);
  });
});
