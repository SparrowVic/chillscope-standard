/** Shared domain contract. This module must not depend on `core/simulation`. */
export type SeriesId = 'temperature' | 'pressure' | 'flow' | 'rpm';

export interface SeriesThresholds {
  readonly warningMin: number;
  readonly warningMax: number;
  readonly criticalMin: number;
  readonly criticalMax: number;
}

const SERIES_THRESHOLD_KEYS = ['warningMin', 'warningMax', 'criticalMin', 'criticalMax'] as const;

export interface SeriesCatalogEntry {
  readonly id: SeriesId;
  readonly unit: string;
  readonly color: string;
  readonly thresholds: SeriesThresholds;
}

/** Thresholds are calibrated against the simulated anomalies and covered by their specs. */
export const SERIES_CATALOG: Readonly<Record<SeriesId, SeriesCatalogEntry>> = {
  temperature: {
    id: 'temperature',
    unit: '°C',
    color: '#d75b3b',
    thresholds: { warningMin: 49, warningMax: 74, criticalMin: 47, criticalMax: 84 },
  },
  pressure: {
    id: 'pressure',
    unit: 'bar',
    color: '#647fdf',
    thresholds: { warningMin: 3.0, warningMax: 5.0, criticalMin: 2.6, criticalMax: 5.6 },
  },
  flow: {
    id: 'flow',
    unit: 'l/min',
    color: '#168f82',
    thresholds: { warningMin: 26, warningMax: 108, criticalMin: 18, criticalMax: 118 },
  },
  rpm: {
    id: 'rpm',
    unit: 'rpm',
    color: '#986bc5',
    thresholds: { warningMin: 900, warningMax: 3050, criticalMin: 600, criticalMax: 3250 },
  },
};

export const SERIES_IDS: readonly SeriesId[] = Object.keys(SERIES_CATALOG) as SeriesId[];

export function isSeriesId(value: string): value is SeriesId {
  return SERIES_IDS.includes(value as SeriesId);
}

export function isSeriesThresholds(value: unknown): value is SeriesThresholds {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }
  const raw = value as Record<string, unknown>;
  const warningMin = raw['warningMin'];
  const warningMax = raw['warningMax'];
  const criticalMin = raw['criticalMin'];
  const criticalMax = raw['criticalMax'];
  const keys = Object.keys(raw);
  return (
    keys.length === SERIES_THRESHOLD_KEYS.length &&
    keys.every((key) => (SERIES_THRESHOLD_KEYS as readonly string[]).includes(key)) &&
    isFiniteNumber(warningMin) &&
    isFiniteNumber(warningMax) &&
    isFiniteNumber(criticalMin) &&
    isFiniteNumber(criticalMax) &&
    criticalMin < warningMin &&
    warningMin < warningMax &&
    warningMax < criticalMax &&
    Number.isFinite(criticalMax - criticalMin)
  );
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

export type BucketId = 'raw' | '5m' | '15m' | '1h' | '6h' | '1d';

const MINUTE = 60_000;

export const BUCKET_MS: Readonly<Record<BucketId, number>> = {
  raw: MINUTE,
  '5m': 5 * MINUTE,
  '15m': 15 * MINUTE,
  '1h': 60 * MINUTE,
  '6h': 360 * MINUTE,
  '1d': 1440 * MINUTE,
};

export const BUCKET_IDS: readonly BucketId[] = Object.keys(BUCKET_MS) as BucketId[];

// Highest to lowest resolution so the first fitting bucket is the most detailed.
const WIDENING_ORDER: readonly BucketId[] = ['raw', '5m', '15m', '1h', '6h', '1d'];

export function isBucketId(value: string): value is BucketId {
  return BUCKET_IDS.includes(value as BucketId);
}

export const MAX_POINTS = 2000;

/** Keeps every accepted range within the point budget at the widest bucket. */
export const MAX_RANGE_MS = MAX_POINTS * BUCKET_MS['1d'];

export function resolveBucket(from: number, to: number, maxPoints: number): BucketId {
  const span = Math.max(0, to - from);
  for (const bucket of WIDENING_ORDER) {
    if (span / BUCKET_MS[bucket] <= maxPoints) {
      return bucket;
    }
  }
  return WIDENING_ORDER[WIDENING_ORDER.length - 1];
}

export function widenToBudget(
  bucket: BucketId,
  from: number,
  to: number,
  maxPoints: number,
): BucketId {
  const minimum = resolveBucket(from, to, maxPoints);
  return BUCKET_MS[bucket] >= BUCKET_MS[minimum] ? bucket : minimum;
}

/** Fixed so reloads produce the same history. */
export const SIMULATION_SEED = 1337;
