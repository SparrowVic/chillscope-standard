import { computed, inject, Injectable, linkedSignal, signal } from '@angular/core';

import { heldValue } from './held-value';
import { toCycleFold, type CycleFold } from './measurement.mapper';
import type { SeriesId } from './measurement.models';
import { MeasurementsRepository, type MeasurementsQuery } from './measurements.repository';

export type CycleDays = 7 | 14 | 30;

export const CYCLE_DAY_CHOICES: readonly CycleDays[] = [7, 14, 30];

const EMPTY_FOLD: CycleFold = { days: [], values: [] };

function localDayWindowStart(anchor: number, days: CycleDays): number {
  const start = new Date(anchor);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (days - 1));
  return start.getTime();
}

@Injectable({ providedIn: 'root' })
export class CycleFacade {
  readonly #repository = inject(MeasurementsRepository);
  readonly #seriesId = signal<SeriesId>('temperature');
  readonly #days = signal<CycleDays>(14);

  readonly seriesId = this.#seriesId.asReadonly();
  readonly days = this.#days.asReadonly();

  readonly #anchor = linkedSignal<{ readonly series: SeriesId; readonly days: CycleDays }, number>({
    source: computed(() => ({ series: this.#seriesId(), days: this.#days() })),
    computation: () => Date.now(),
  });

  readonly #query = computed<MeasurementsQuery>(() => ({
    series: [this.#seriesId()],
    from: localDayWindowStart(this.#anchor(), this.#days()),
    to: this.#anchor(),
    bucket: '1h',
  }));

  readonly #resource = this.#repository.measurementsFor(this.#query);
  readonly #shown = heldValue(this.#resource, { measures: [] });

  readonly fold = computed<CycleFold>(() =>
    this.#shown().measures.length === 0 ? EMPTY_FOLD : toCycleFold(this.#shown(), this.#seriesId()),
  );

  readonly error = computed(() => this.#resource.error());
  readonly isLoading = computed(() => this.#resource.isLoading());
  readonly isInitialLoading = computed(() => this.isLoading() && this.fold().days.length === 0);

  setSeries(series: SeriesId): void {
    this.#seriesId.set(series);
  }

  setDays(days: CycleDays): void {
    this.#days.set(days);
  }

  reload(): void {
    this.#resource.reload();
  }
}
