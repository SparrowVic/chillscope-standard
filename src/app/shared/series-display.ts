import type { SeriesId } from '../core/data/measurement.models';

export const SERIES_LABEL_KEYS: Readonly<Record<SeriesId, string>> = {
  temperature: 'series.temperature',
  pressure: 'series.pressure',
  flow: 'series.flow',
  rpm: 'series.rpm',
};

export const SERIES_UNIT_KEYS: Readonly<Record<SeriesId, string>> = {
  temperature: 'units.celsius',
  pressure: 'units.bar',
  flow: 'units.litersPerMinute',
  rpm: 'units.rpm',
};
