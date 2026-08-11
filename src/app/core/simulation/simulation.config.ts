import { SIMULATION_SEED } from '../data/series.catalog';

export const SIMULATION_CONFIG = {
  seed: SIMULATION_SEED,
  minLatencyMs: 120,
  maxLatencyMs: 400,
  workerTimeoutMs: 30_000,
} as const;
