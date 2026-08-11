export type SeriesId = 'temperature' | 'pressure' | 'flow' | 'rpm';

export type ChartTheme = 'light' | 'dark';

export interface ChartSeries {
  readonly id: SeriesId;
  readonly label: string;
  readonly unit: string;
  readonly color: string;
  readonly t: readonly number[];
  readonly v: readonly number[];
}

export interface SeriesThresholdBand {
  readonly warningMin: number;
  readonly warningMax: number;
  readonly criticalMin: number;
  readonly criticalMax: number;
}

export type ChartThresholds = Readonly<Record<string, SeriesThresholdBand>>;

export interface ChartLabels {
  readonly empty: string;
  readonly loading: string;
  readonly ariaLabel: string;
}

export interface RangeSelectedDetail {
  readonly from: number;
  readonly to: number;
}

/** Row-major daily data with 24 hourly cells per day. Missing hours are `null`, not zero. */
export interface HeatmapMatrix {
  /** Local-midnight timestamps of each row, oldest first. */
  readonly days: readonly number[];
  /** `days.length × 24` hourly means, row-major; `null` = no sample. */
  readonly values: readonly (number | null)[];
  /** Translated before crossing the custom-element boundary. */
  readonly label: string;
  readonly unit: string;
  readonly color: string;
}

export interface HeatmapLabels {
  readonly empty: string;
  readonly loading: string;
  readonly ariaLabel: string;
}
