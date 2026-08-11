import {
  BUCKET_MS,
  MAX_POINTS,
  type BucketId,
  type SeriesId,
  widenToBudget,
} from '../data/series.catalog';
import { aggregate, type SampleColumns } from './aggregation';
import { SERIES_MODELS } from './series-models';

export interface GenerateRequest {
  readonly from: number;
  readonly to: number;
  readonly series: readonly SeriesId[];
  readonly bucket?: BucketId;
}

export interface GeneratedSeries {
  readonly id: SeriesId;
  readonly t: number[];
  readonly v: number[];
}

const MAX_SAMPLES_PER_BUCKET = 60;

function rawStepFor(bucketMs: number): number {
  const minutes = Math.max(1, Math.floor(bucketMs / (MAX_SAMPLES_PER_BUCKET * BUCKET_MS.raw)));
  return minutes * BUCKET_MS.raw;
}

function sampleRange(
  id: SeriesId,
  from: number,
  to: number,
  seed: number,
  stepMs: number,
): SampleColumns {
  const { sampleAt } = SERIES_MODELS[id];
  const t: number[] = [];
  const v: number[] = [];
  for (let timestamp = Math.ceil(from / stepMs) * stepMs; timestamp < to; timestamp += stepMs) {
    t.push(timestamp);
    v.push(sampleAt(timestamp, seed));
  }
  return { t, v };
}

function completeBuckets(
  columns: SampleColumns,
  from: number,
  to: number,
  bucketMs: number,
): SampleColumns {
  let first = 0;
  while (first < columns.t.length && columns.t[first] < from) {
    first += 1;
  }
  let last = columns.t.length - 1;
  while (last >= first && columns.t[last] + bucketMs > to) {
    last -= 1;
  }
  if (last < first) {
    if (columns.t.length === 0) {
      return columns;
    }
    const partial = first < columns.t.length ? first : columns.t.length - 1;
    return { t: [columns.t[partial]], v: [columns.v[partial]] };
  }
  return { t: columns.t.slice(first, last + 1), v: columns.v.slice(first, last + 1) };
}

export function generateSeries(request: GenerateRequest, seed: number): GeneratedSeries[] {
  const { from, to, series } = request;
  if (to <= from) {
    return series.map((id) => ({ id, t: [], v: [] }));
  }

  const bucket = widenToBudget(request.bucket ?? 'raw', from, to, MAX_POINTS);
  const bucketMs = BUCKET_MS[bucket];
  const stepMs = bucket === 'raw' ? BUCKET_MS.raw : rawStepFor(bucketMs);

  return series.map((id) => {
    const samples = sampleRange(id, from, to, seed, stepMs);
    if (bucket === 'raw') {
      return { id, t: samples.t, v: samples.v };
    }
    const aggregated = aggregate(samples.t, samples.v, bucketMs, 'avg');
    const reduced = completeBuckets(aggregated, from, to, bucketMs);
    return { id, t: reduced.t, v: reduced.v };
  });
}
