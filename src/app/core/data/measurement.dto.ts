import type { SeriesId, SeriesThresholds } from './series.catalog';

export interface MeasurementDto {
  readonly name: string;
  readonly value: number;
  readonly date: string;
}

export interface MeasurementsResponseDto {
  readonly measures: readonly MeasurementDto[];
}

export interface SeriesDescriptorDto {
  readonly id: SeriesId;
  readonly unit: string;
  readonly color: string;
  readonly thresholds: SeriesThresholds;
}
