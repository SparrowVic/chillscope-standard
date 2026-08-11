import type {
  MeasurementDto,
  MeasurementsResponseDto,
  SeriesDescriptorDto,
} from '../data/measurement.dto';
import { SERIES_CATALOG, SERIES_IDS } from '../data/series.catalog';
import type { GeneratedSeries } from './generator';

export function toMeasurementsDto(series: readonly GeneratedSeries[]): MeasurementsResponseDto {
  const measures: MeasurementDto[] = [];
  for (const entry of series) {
    for (let i = 0; i < entry.t.length; i++) {
      measures.push({
        name: entry.id,
        value: entry.v[i],
        date: new Date(entry.t[i]).toISOString(),
      });
    }
  }
  measures.sort((a, b) => a.date.localeCompare(b.date));
  return { measures };
}

export function toSeriesCatalogueDto(): SeriesDescriptorDto[] {
  return SERIES_IDS.map((id) => ({ ...SERIES_CATALOG[id] }));
}
