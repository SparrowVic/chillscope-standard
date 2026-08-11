import type { HttpResourceRef } from '@angular/common/http';
import { signal, type Signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { MeasurementsResponseDto } from './measurement.dto';
import { CycleFacade } from './cycle.facade';
import { MeasurementsRepository, type MeasurementsQuery } from './measurements.repository';

class RepositoryStub {
  readonly response = signal<MeasurementsResponseDto>({
    measures: [
      { name: 'temperature', value: 10, date: '2026-08-05T08:00:00.000Z' },
      { name: 'temperature', value: 30, date: '2026-08-05T08:20:00.000Z' },
      { name: 'pressure', value: 3, date: '2026-08-05T09:00:00.000Z' },
    ],
  });
  readonly loading = signal(false);
  readonly error = signal<unknown>(undefined);
  readonly reload = vi.fn();
  query: Signal<MeasurementsQuery | undefined> | undefined;

  measurementsFor(
    query: Signal<MeasurementsQuery | undefined>,
  ): HttpResourceRef<MeasurementsResponseDto> {
    this.query = query;
    return {
      isLoading: this.loading,
      error: this.error,
      hasValue: () => true,
      value: this.response,
      reload: this.reload,
    } as unknown as HttpResourceRef<MeasurementsResponseDto>;
  }
}

describe('CycleFacade', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.useRealTimers();
    TestBed.resetTestingModule();
  });

  it('requests exactly the selected number of local calendar days', () => {
    vi.useFakeTimers();
    const firstNow = new Date(2026, 7, 5, 12, 30).getTime();
    vi.setSystemTime(firstNow);
    const repository = new RepositoryStub();
    TestBed.configureTestingModule({
      providers: [{ provide: MeasurementsRepository, useValue: repository }],
    });

    const facade = TestBed.inject(CycleFacade);
    const firstStart = new Date(firstNow);
    firstStart.setHours(0, 0, 0, 0);
    firstStart.setDate(firstStart.getDate() - 13);

    expect(repository.query?.()).toEqual({
      series: ['temperature'],
      from: firstStart.getTime(),
      to: firstNow,
      bucket: '1h',
    });

    const nextNow = new Date(2026, 7, 6, 12, 30).getTime();
    vi.setSystemTime(nextNow);
    facade.setSeries('flow');
    facade.setDays(30);
    const nextStart = new Date(nextNow);
    nextStart.setHours(0, 0, 0, 0);
    nextStart.setDate(nextStart.getDate() - 29);

    expect(repository.query?.()).toEqual({
      series: ['flow'],
      from: nextStart.getTime(),
      to: nextNow,
      bucket: '1h',
    });
  });

  it('steps through local dates rather than fixed 24-hour periods across DST', () => {
    vi.stubEnv('TZ', 'Europe/Warsaw');
    vi.useFakeTimers();
    const now = new Date(2026, 2, 30, 12).getTime();
    vi.setSystemTime(now);
    const repository = new RepositoryStub();
    TestBed.configureTestingModule({
      providers: [{ provide: MeasurementsRepository, useValue: repository }],
    });

    const facade = TestBed.inject(CycleFacade);
    facade.setDays(7);
    const query = repository.query?.();
    const expectedStart = new Date(2026, 2, 24, 0).getTime();

    if (query === undefined) {
      throw new Error('Expected the cycle query to be active');
    }
    expect(query).toMatchObject({ from: expectedStart, to: now });
    expect(query.to - query.from).toBe(155 * 60 * 60 * 1000);

    const days: number[] = [];
    for (
      const cursor = new Date(expectedStart);
      cursor.getTime() <= now;
      cursor.setDate(cursor.getDate() + 1)
    ) {
      days.push(cursor.getTime());
    }
    expect(days).toHaveLength(7);
  });

  it('folds only the selected series and exposes resource state', () => {
    const repository = new RepositoryStub();
    TestBed.configureTestingModule({
      providers: [{ provide: MeasurementsRepository, useValue: repository }],
    });
    const facade = TestBed.inject(CycleFacade);

    expect(facade.fold().values.filter((value) => value !== null)).toEqual([20]);
    expect(facade.isInitialLoading()).toBe(false);

    facade.reload();
    expect(repository.reload).toHaveBeenCalledOnce();

    repository.response.set({ measures: [] });
    repository.loading.set(true);
    expect(facade.fold().days).not.toHaveLength(0);

    repository.loading.set(false);
    expect(facade.fold()).toEqual({ days: [], values: [] });
  });
});
