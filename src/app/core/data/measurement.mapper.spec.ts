import { describe, expect, it } from 'vitest';
import type { MeasurementsResponseDto, SeriesDescriptorDto } from './measurement.dto';
import {
  fromMeasurementsDto,
  fromSeriesDescriptorsDto,
  toChartSeries,
  toChartThresholds,
  toCycleFold,
} from './measurement.mapper';
import type { SeriesDescriptor } from './measurement.models';

const TEMPERATURE: SeriesDescriptor = {
  id: 'temperature',
  unit: '°C',
  color: 'temperature',
  thresholds: { criticalMin: 47, warningMin: 49, warningMax: 74, criticalMax: 84 },
};

describe('measurement DTO mappers', () => {
  it('drops malformed measurements without breaking column alignment', () => {
    const dto = {
      measures: [
        { name: 'temperature', value: 60, date: '2026-08-05T10:00:00.000Z' },
        { name: 'temperature', value: Number.NaN, date: '2026-08-05T10:01:00.000Z' },
        { name: 'temperature', value: 61, date: 'not-a-date' },
      ],
    } satisfies MeasurementsResponseDto;

    expect(fromMeasurementsDto(dto, [TEMPERATURE])[0].points).toEqual({
      t: [Date.parse('2026-08-05T10:00:00.000Z')],
      v: [60],
    });
  });

  it('drops malformed catalogue bands at the HTTP boundary', () => {
    const malformed = {
      id: 'temperature',
      unit: '°C',
      color: 'temperature',
      thresholds: { criticalMin: 50, warningMin: 40, warningMax: 74, criticalMax: 84 },
    } satisfies SeriesDescriptorDto;
    expect(fromSeriesDescriptorsDto([malformed])).toEqual([]);
  });

  it('hands the chart localised labels and units instead of raw API symbols', () => {
    const series = fromMeasurementsDto(
      {
        measures: [{ name: 'temperature', value: 60, date: '2026-08-05T10:00:00.000Z' }],
      },
      [TEMPERATURE],
    );
    const copy = {
      temperature: 'Temperatura',
      pressure: 'Ciśnienie',
      flow: 'Przepływ',
      rpm: 'Obroty',
    } as const;
    const units = {
      temperature: 'st. C',
      pressure: 'bar',
      flow: 'l/min',
      rpm: 'obr/min',
    } as const;

    expect(toChartSeries(series, copy, units)[0]).toMatchObject({
      label: 'Temperatura',
      unit: 'st. C',
    });
    expect(toChartThresholds(series)).toEqual({ temperature: TEMPERATURE.thresholds });
  });
});

describe('toCycleFold', () => {
  const hour = (day: number, at: number): number => new Date(2026, 7, day, at).getTime();

  it('returns an empty fold for no samples', () => {
    expect(toCycleFold({ measures: [] }, 'temperature')).toEqual({ days: [], values: [] });
  });

  it('lays samples into contiguous local-day rows with 24 cells each', () => {
    const fold = toCycleFold(
      {
        measures: [
          { name: 'temperature', value: 10, date: new Date(hour(3, 0)).toISOString() },
          { name: 'temperature', value: 20, date: new Date(hour(3, 23)).toISOString() },
          { name: 'temperature', value: 30, date: new Date(hour(5, 12)).toISOString() },
        ],
      },
      'temperature',
    );

    expect(fold.days).toEqual([
      new Date(2026, 7, 3).getTime(),
      new Date(2026, 7, 4).getTime(),
      new Date(2026, 7, 5).getTime(),
    ]);
    expect(fold.values).toHaveLength(72);
    expect(fold.values[0]).toBe(10);
    expect(fold.values[23]).toBe(20);
    expect(fold.values.slice(24, 48).every((value) => value === null)).toBe(true);
    expect(fold.values[48 + 12]).toBe(30);
  });

  it('keeps missing hours null and averages samples that share an hour', () => {
    const base = hour(3, 8);
    const fold = toCycleFold(
      {
        measures: [
          { name: 'temperature', value: 10, date: new Date(base).toISOString() },
          {
            name: 'temperature',
            value: 30,
            date: new Date(base + 20 * 60 * 1000).toISOString(),
          },
          { name: 'pressure', value: 999, date: new Date(base).toISOString() },
          { name: 'temperature', value: 999, date: 'not-a-date' },
        ],
      },
      'temperature',
    );

    expect(fold.values[8]).toBe(20);
    expect(fold.values[9]).toBeNull();
    expect(fold.values.filter((value) => value !== null)).toHaveLength(1);
  });
});
