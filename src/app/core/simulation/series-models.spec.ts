import { describe, expect, it } from 'vitest';
import { SERIES_CATALOG, SERIES_IDS, type SeriesId } from '../data/series.catalog';
import { SERIES_MODELS, machineStateAt } from './series-models';

const SEED = 1337;
const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;
const START = Date.UTC(2026, 0, 1);

const PHYSICAL_BOUNDS: Readonly<Record<SeriesId, readonly [number, number]>> = {
  temperature: [20, 120],
  pressure: [0, 8],
  flow: [0, 200],
  rpm: [0, 4000],
};

function isOutsideNormalBand(id: SeriesId, value: number): boolean {
  const { warningMin, warningMax } = SERIES_CATALOG[id].thresholds;
  return value < warningMin || value > warningMax;
}

describe('series models', () => {
  it('is deterministic for a given timestamp and seed', () => {
    for (const id of SERIES_IDS) {
      expect(SERIES_MODELS[id].sampleAt(START, SEED)).toBe(SERIES_MODELS[id].sampleAt(START, SEED));
    }
  });

  it('produces different data for a different seed', () => {
    const model = SERIES_MODELS.temperature;
    expect(model.sampleAt(START, SEED)).not.toBe(model.sampleAt(START, SEED + 1));
  });

  it('keeps every sample inside plausible physical bounds over a week', () => {
    for (const id of SERIES_IDS) {
      const [min, max] = PHYSICAL_BOUNDS[id];
      for (let t = START; t < START + 7 * DAY; t += MINUTE) {
        const value = SERIES_MODELS[id].sampleAt(t, SEED);
        expect(Number.isFinite(value)).toBe(true);
        expect(value).toBeGreaterThanOrEqual(min);
        expect(value).toBeLessThanOrEqual(max);
      }
    }
  });

  it('shows a daily cycle in temperature', () => {
    const samples: number[] = [];
    for (let t = START; t < START + DAY; t += 15 * MINUTE) {
      samples.push(SERIES_MODELS.temperature.sampleAt(t, SEED));
    }
    expect(Math.max(...samples) - Math.min(...samples)).toBeGreaterThan(4);
  });

  it('correlates pressure inversely with temperature', () => {
    const model = SERIES_MODELS.pressure;
    const cold = model.sampleAt(START, SEED);
    const hot = model.sampleAt(START + 6 * 60 * MINUTE, SEED);
    const temperatureRose =
      SERIES_MODELS.temperature.sampleAt(START + 6 * 60 * MINUTE, SEED) >
      SERIES_MODELS.temperature.sampleAt(START, SEED);
    expect(temperatureRose ? hot < cold : hot > cold).toBe(true);
  });

  it('drops the load on every driven series while the machine is on standby', () => {
    let standbySamples = 0;
    for (let t = START; t < START + 7 * DAY; t += MINUTE) {
      if (machineStateAt(t, SEED) !== 'standby') {
        continue;
      }
      standbySamples++;
      expect(SERIES_MODELS.rpm.sampleAt(t, SEED)).toBeLessThan(1500);
      expect(SERIES_MODELS.flow.sampleAt(t, SEED)).toBeLessThan(50);
    }
    expect(standbySamples).toBeGreaterThan(0);
  });

  it('keeps standby samples inside the chart normal band', () => {
    for (let t = START; t < START + 30 * DAY; t += MINUTE) {
      if (machineStateAt(t, SEED) !== 'standby') {
        continue;
      }
      for (const id of SERIES_IDS) {
        const value = SERIES_MODELS[id].sampleAt(t, SEED);
        expect(isOutsideNormalBand(id, value)).toBe(false);
      }
    }
  });

  it('reaches every configured chart threshold within a month', () => {
    const crossed = new Set<string>();
    for (let t = START; t < START + 30 * DAY; t += MINUTE) {
      for (const id of SERIES_IDS) {
        const value = SERIES_MODELS[id].sampleAt(t, SEED);
        const { warningMin, warningMax, criticalMin, criticalMax } = SERIES_CATALOG[id].thresholds;
        if (value > criticalMax) {
          crossed.add(`${id}.criticalMax`);
        } else if (value > warningMax) {
          crossed.add(`${id}.warningMax`);
        } else if (value < criticalMin) {
          crossed.add(`${id}.criticalMin`);
        } else if (value < warningMin) {
          crossed.add(`${id}.warningMin`);
        }
      }
    }
    expect([...crossed].sort()).toHaveLength(4 * SERIES_IDS.length);
  });

  it('does not spend most of the week outside the normal chart band', () => {
    for (const id of SERIES_IDS) {
      let breaching = 0;
      let total = 0;
      for (let t = START; t < START + 7 * DAY; t += MINUTE) {
        total++;
        if (isOutsideNormalBand(id, SERIES_MODELS[id].sampleAt(t, SEED))) {
          breaching++;
        }
      }
      expect(breaching / total).toBeLessThan(0.1);
    }
  });
});
