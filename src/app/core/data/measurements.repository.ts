import { type HttpResourceRef, type HttpResourceRequest, httpResource } from '@angular/common/http';
import { Injectable, type Signal } from '@angular/core';
import type { MeasurementsResponseDto, SeriesDescriptorDto } from './measurement.dto';
import type { SeriesId } from './measurement.models';
import type { BucketId } from './series.catalog';

export interface MeasurementsQuery {
  readonly series: readonly SeriesId[];
  readonly from: number;
  readonly to: number;
  readonly bucket?: BucketId;
}

const SERIES_URL = '/api/series';
const MEASUREMENTS_URL = '/api/measurements';

const EMPTY_MEASUREMENTS: MeasurementsResponseDto = { measures: [] };

function measurementParams(query: MeasurementsQuery): Record<string, string> {
  return {
    series: query.series.join(','),
    from: new Date(query.from).toISOString(),
    to: new Date(query.to).toISOString(),
    ...(query.bucket === undefined ? {} : { bucket: query.bucket }),
  };
}

@Injectable({ providedIn: 'root' })
export class MeasurementsRepository {
  readonly seriesCatalogue: HttpResourceRef<SeriesDescriptorDto[]> = httpResource<
    SeriesDescriptorDto[]
  >(() => SERIES_URL, { defaultValue: [] });

  measurementsFor(
    query: Signal<MeasurementsQuery | undefined>,
  ): HttpResourceRef<MeasurementsResponseDto> {
    return httpResource<MeasurementsResponseDto>(
      (): HttpResourceRequest | undefined => {
        const current = query();
        if (current === undefined || current.series.length === 0) {
          return undefined;
        }
        return { url: MEASUREMENTS_URL, params: measurementParams(current) };
      },
      { defaultValue: EMPTY_MEASUREMENTS },
    );
  }
}
