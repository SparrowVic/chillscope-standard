import {
  DOCUMENT,
  DestroyRef,
  Injectable,
  computed,
  effect,
  inject,
  linkedSignal,
  signal,
  type WritableSignal,
} from '@angular/core';

import { SettingsStore } from '../settings/settings.store';
import { heldValue } from './held-value';
import type { MeasurementsResponseDto, SeriesDescriptorDto } from './measurement.dto';
import { fromMeasurementsDto, fromSeriesDescriptorsDto } from './measurement.mapper';
import type { MeasurementSeries, SeriesDescriptor, SeriesId } from './measurement.models';
import { MeasurementsRepository, type MeasurementsQuery } from './measurements.repository';
import {
  BUCKET_MS,
  MAX_POINTS,
  MAX_RANGE_MS,
  SERIES_IDS,
  type BucketId,
  resolveBucket,
  widenToBudget,
} from './series.catalog';

const HOUR_MS = 3_600_000;
const DEFAULT_SPAN_MS = 6 * HOUR_MS;
const EMPTY_MEASUREMENTS: MeasurementsResponseDto = { measures: [] };
const EMPTY_CATALOGUE: readonly SeriesDescriptorDto[] = [];

function sameSeries(a: readonly SeriesId[], b: readonly SeriesId[]): boolean {
  return a.length === b.length && a.every((id, index) => id === b[index]);
}

export function orderedSeries(
  measurements: MeasurementsResponseDto,
  catalogue: readonly SeriesDescriptor[],
  order: readonly SeriesId[],
): MeasurementSeries[] {
  const loaded = new Map(
    fromMeasurementsDto(measurements, catalogue).map((entry) => [entry.id, entry]),
  );
  return order.flatMap((id) => {
    const entry = loaded.get(id);
    return entry === undefined ? [] : [entry];
  });
}

interface BucketSource {
  readonly from: number;
  readonly to: number;
  readonly auto: BucketId;
}

@Injectable({ providedIn: 'root' })
export class MeasurementsFacade {
  readonly #repository = inject(MeasurementsRepository);
  readonly #settings = inject(SettingsStore);
  readonly #catalogueResource = this.#repository.seriesCatalogue;
  readonly #from = signal(Date.now() - DEFAULT_SPAN_MS);
  readonly #to = signal(Date.now());
  readonly #liveEnabled = signal(false);
  readonly #liveConsumers = signal(0);
  readonly #pageVisible = signal(true);

  readonly #shownCatalogue = heldValue(this.#catalogueResource, EMPTY_CATALOGUE);

  readonly catalogue = computed<SeriesDescriptor[]>(() =>
    fromSeriesDescriptorsDto(this.#shownCatalogue()),
  );

  readonly #availableSeries = computed(() => this.catalogue().map((entry) => entry.id), {
    equal: sameSeries,
  });

  readonly #seriesSelectionTouched = signal(false);
  readonly #selectedSeries = linkedSignal<
    { readonly available: readonly SeriesId[]; readonly touched: boolean },
    readonly SeriesId[]
  >({
    source: () => ({
      available: this.#availableSeries(),
      touched: this.#seriesSelectionTouched(),
    }),
    computation: ({ available, touched }, previous) => {
      const current = previous?.value ?? SERIES_IDS;
      if (available.length === 0) {
        return current;
      }
      if (!touched) {
        return available;
      }
      const kept = current.filter((id) => available.includes(id));
      return kept.length > 0 ? kept : available;
    },
    equal: sameSeries,
  });

  readonly #autoBucket = computed(() => resolveBucket(this.#from(), this.#to(), MAX_POINTS));

  readonly #bucketSource = computed<BucketSource>(() => ({
    from: this.#from(),
    to: this.#to(),
    auto: this.#autoBucket(),
  }));

  readonly #bucket = linkedSignal<BucketSource, BucketId>({
    source: this.#bucketSource,
    computation: ({ auto }) => auto,
  });

  readonly query = computed<MeasurementsQuery>(() => ({
    series: this.#selectedSeries(),
    from: this.#from(),
    to: this.#to(),
    bucket: this.#bucket(),
  }));

  readonly #measurements = this.#repository.measurementsFor(this.query);
  readonly #shownMeasurements = heldValue(this.#measurements, EMPTY_MEASUREMENTS);

  readonly selectedSeries = this.#selectedSeries.asReadonly();
  readonly bucket = this.#bucket.asReadonly();
  readonly liveEnabled = this.#liveEnabled.asReadonly();
  readonly range = computed(() => ({ from: this.#from(), to: this.#to() }));

  readonly isLoading = computed(
    () => this.#catalogueResource.isLoading() || this.#measurements.isLoading(),
  );
  readonly error = computed(() => this.#catalogueResource.error() ?? this.#measurements.error());
  readonly series = computed<MeasurementSeries[]>(() =>
    orderedSeries(this.#shownMeasurements(), this.catalogue(), this.#selectedSeries()),
  );
  readonly hasData = computed(() => this.series().some((entry) => entry.points.t.length > 0));
  readonly isInitialLoading = computed(() => this.isLoading() && !this.hasData());

  constructor() {
    const document = inject(DOCUMENT);
    this.#pageVisible.set(!document.hidden);
    const onVisibility = (): void => this.#pageVisible.set(!document.hidden);
    document.addEventListener('visibilitychange', onVisibility);
    inject(DestroyRef).onDestroy(() =>
      document.removeEventListener('visibilitychange', onVisibility),
    );

    effect((onCleanup) => {
      if (!this.#liveEnabled() || this.#liveConsumers() === 0 || !this.#pageVisible()) {
        return;
      }
      this.tick();
      const handle = setInterval(() => this.tick(), this.#settings.liveIntervalMs());
      onCleanup(() => clearInterval(handle));
    });
  }

  setSeries(ids: readonly SeriesId[]): void {
    if (ids.length > 0) {
      this.#seriesSelectionTouched.set(true);
      this.#selectedSeries.set([...ids]);
    }
  }

  setRange(from: number, to: number): void {
    if (!Number.isFinite(from) || !Number.isFinite(to) || to <= from) {
      return;
    }
    this.#from.set(Math.max(from, to - MAX_RANGE_MS));
    this.#to.set(to);
    if (to < Date.now() - this.#settings.liveIntervalMs()) {
      this.#liveEnabled.set(false);
    }
  }

  setSpan(spanMs: number): void {
    const now = Date.now();
    this.setRange(now - spanMs, now);
  }

  setBucket(bucket: BucketId): void {
    this.#bucket.set(widenToBudget(bucket, this.#from(), this.#to(), MAX_POINTS));
  }

  resetBucket(): void {
    this.#bucket.set(this.#autoBucket());
  }

  setLiveEnabled(enabled: boolean): void {
    this.#liveEnabled.set(enabled);
  }

  activateLive(): () => void {
    return this.#acquireConsumer(this.#liveConsumers);
  }

  #acquireConsumer(counter: WritableSignal<number>): () => void {
    counter.update((count) => count + 1);
    let active = true;
    return (): void => {
      if (!active) {
        return;
      }
      active = false;
      counter.update((count) => Math.max(0, count - 1));
    };
  }

  tick(): void {
    const now = Date.now();
    const from = this.#from();
    const to = this.#to();
    const span = to - from;
    const nextFrom = now - span;
    const stepMs = BUCKET_MS.raw;
    const sameGrid =
      Math.ceil(nextFrom / stepMs) === Math.ceil(from / stepMs) &&
      Math.ceil(now / stepMs) === Math.ceil(to / stepMs);
    if (sameGrid) {
      return;
    }
    this.#from.set(nextFrom);
    this.#to.set(now);
  }

  reload(): void {
    this.#catalogueResource.reload();
    this.#measurements.reload();
  }
}
