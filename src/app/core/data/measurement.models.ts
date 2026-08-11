import type { SeriesId, SeriesThresholds } from './series.catalog';

export type { SeriesId, SeriesThresholds };

/** Columnar data avoids remapping large series before they reach ECharts. */
export interface SeriesPoints {
  readonly t: readonly number[];
  readonly v: readonly number[];
}

export interface SeriesDescriptor {
  readonly id: SeriesId;
  readonly unit: string;
  readonly color: string;
  readonly thresholds: SeriesThresholds;
}

export interface MeasurementSeries extends SeriesDescriptor {
  readonly points: SeriesPoints;
}
