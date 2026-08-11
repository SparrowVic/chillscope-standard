import type { ChartSeries, ChartThresholds } from '@chillscope/chart/types';
import type { MeasurementsResponseDto, SeriesDescriptorDto } from './measurement.dto';
import type { MeasurementSeries, SeriesDescriptor, SeriesId } from './measurement.models';
import { isSeriesId, isSeriesThresholds } from './series.catalog';

interface MutablePoints {
  t: number[];
  v: number[];
}

export function fromMeasurementsDto(
  dto: MeasurementsResponseDto,
  descriptors: readonly SeriesDescriptor[],
): MeasurementSeries[] {
  const byId = new Map(descriptors.map((descriptor) => [descriptor.id, descriptor]));
  const points = new Map<SeriesId, MutablePoints>();

  for (const measure of dto.measures) {
    const timestamp = Date.parse(measure.date);
    if (
      !isSeriesId(measure.name) ||
      !byId.has(measure.name) ||
      !Number.isFinite(measure.value) ||
      !Number.isFinite(timestamp)
    ) {
      continue;
    }
    let bucket = points.get(measure.name);
    if (bucket === undefined) {
      bucket = { t: [], v: [] };
      points.set(measure.name, bucket);
    }
    bucket.t.push(timestamp);
    bucket.v.push(measure.value);
  }

  return [...points].flatMap(([id, bucket]) => {
    const descriptor = byId.get(id);
    return descriptor ? [{ ...descriptor, points: bucket }] : [];
  });
}

export function fromSeriesDescriptorsDto(dto: readonly SeriesDescriptorDto[]): SeriesDescriptor[] {
  return dto
    .filter(
      (descriptor) =>
        isSeriesId(descriptor.id) &&
        typeof descriptor.unit === 'string' &&
        descriptor.unit.length > 0 &&
        typeof descriptor.color === 'string' &&
        descriptor.color.length > 0 &&
        isSeriesThresholds(descriptor.thresholds),
    )
    .map((descriptor) => ({
      id: descriptor.id,
      unit: descriptor.unit,
      color: descriptor.color,
      thresholds: descriptor.thresholds,
    }));
}

export function toChartSeries(
  series: readonly MeasurementSeries[],
  labels: Readonly<Record<SeriesId, string>>,
  units: Readonly<Record<SeriesId, string>>,
): ChartSeries[] {
  return series.map((entry) => ({
    id: entry.id,
    label: labels[entry.id],
    unit: units[entry.id],
    color: entry.color,
    t: entry.points.t,
    v: entry.points.v,
  }));
}

export function toChartThresholds(series: readonly MeasurementSeries[]): ChartThresholds {
  return Object.fromEntries(series.map((entry) => [entry.id, entry.thresholds]));
}

export interface CycleFold {
  readonly days: readonly number[];
  readonly values: readonly (number | null)[];
}

/** Empty hours stay null so future hours remain distinct from real zero readings. */
export function toCycleFold(dto: MeasurementsResponseDto, seriesId: SeriesId): CycleFold {
  const points = dto.measures.flatMap((measure) => {
    const timestamp = Date.parse(measure.date);
    return measure.name === seriesId && Number.isFinite(measure.value) && Number.isFinite(timestamp)
      ? [{ timestamp, value: measure.value }]
      : [];
  });
  if (points.length === 0) {
    return { days: [], values: [] };
  }

  const dayOf = (timestamp: number): number => new Date(timestamp).setHours(0, 0, 0, 0);
  const firstDay = dayOf(points[0].timestamp);
  const lastDay = dayOf(points[points.length - 1].timestamp);
  const days: number[] = [];

  // Calendar stepping preserves local-day rows across 23- and 25-hour DST transitions.
  for (let day = firstDay; day <= lastDay;) {
    days.push(day);
    const next = new Date(day);
    next.setDate(next.getDate() + 1);
    day = next.getTime();
  }

  const rowByDay = new Map(days.map((day, index) => [day, index]));
  const sums = new Array<number>(days.length * 24).fill(0);
  const counts = new Array<number>(days.length * 24).fill(0);

  for (const point of points) {
    const timestamp = point.timestamp;
    const row = rowByDay.get(dayOf(timestamp));
    if (row === undefined) {
      continue;
    }
    const cell = row * 24 + new Date(timestamp).getHours();
    sums[cell] += point.value;
    counts[cell] += 1;
  }

  return {
    days,
    values: sums.map((sum, cell) => (counts[cell] === 0 ? null : sum / counts[cell])),
  };
}
