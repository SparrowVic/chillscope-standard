import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
  viewChild,
} from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';

import type { SeriesDescriptor, SeriesId } from '../../../core/data/measurement.models';
import type { BucketId } from '../../../core/data/series.catalog';
import { injectClock } from '../../../shared/clock';
import { CsFilterShell } from '../../../shared/components/filter-shell/filter-shell';
import {
  MINUTE_MS,
  matchRangePreset,
  rangePresetShortLabelKey,
  type TimeRange,
} from '../../../shared/time';
import { RangePicker } from '../range-picker/range-picker';
import { SeriesPicker } from '../series-picker/series-picker';

const CLOCK_INTERVAL_MS = MINUTE_MS;
const PRESET_TOLERANCE_MS = 2 * MINUTE_MS;

type BucketDraft = BucketId | 'auto';

@Component({
  selector: 'app-dashboard-filters',
  imports: [CsFilterShell, RangePicker, SeriesPicker, TranslocoPipe],
  templateUrl: './dashboard-filters.html',
  styleUrl: './dashboard-filters.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardFilters {
  readonly available = input.required<readonly SeriesDescriptor[]>();
  readonly selected = input.required<readonly SeriesId[]>();
  readonly range = input.required<TimeRange>();
  readonly bucket = input.required<BucketId>();

  readonly selectedChange = output<SeriesId[]>();
  readonly rangeChange = output<TimeRange>();
  readonly bucketChange = output<BucketId>();
  readonly bucketReset = output<void>();

  readonly #now = injectClock(CLOCK_INTERVAL_MS);

  private readonly shell = viewChild.required(CsFilterShell);

  #stagedSeries: SeriesId[] | undefined;
  #stagedRange: TimeRange | undefined;
  #stagedBucket: BucketDraft | undefined;

  protected readonly activeCount = computed(() => {
    const available = this.available();
    const narrowed = available.length > 0 && this.selected().length < available.length;
    return narrowed ? 1 : 0;
  });

  protected readonly summaryRangeKey = computed(() => {
    const preset = matchRangePreset(this.range(), PRESET_TOLERANCE_MS, this.#now());
    return preset === undefined ? 'range.custom' : rangePresetShortLabelKey(preset);
  });

  protected onSeriesPicked(ids: SeriesId[]): void {
    if (this.shell().deferred()) {
      this.#stagedSeries = ids;
    } else {
      this.selectedChange.emit(ids);
    }
  }

  protected onRangePicked(range: TimeRange): void {
    if (this.shell().deferred()) {
      this.#stagedRange = range;
    } else {
      this.rangeChange.emit(range);
    }
  }

  protected onBucketPicked(bucket: BucketId): void {
    if (this.shell().deferred()) {
      this.#stagedBucket = bucket;
    } else {
      this.bucketChange.emit(bucket);
    }
  }

  protected onBucketReset(): void {
    if (this.shell().deferred()) {
      this.#stagedBucket = 'auto';
    } else {
      this.bucketReset.emit();
    }
  }

  protected commitStaged(): void {
    const series = this.#stagedSeries;
    const range = this.#stagedRange;
    const bucket = this.#stagedBucket;
    this.#clearStaged();
    if (series !== undefined) {
      this.selectedChange.emit(series);
    }
    if (range !== undefined) {
      this.rangeChange.emit(range);
    }
    if (bucket === 'auto') {
      this.bucketReset.emit();
    } else if (bucket !== undefined) {
      this.bucketChange.emit(bucket);
    }
  }

  protected discardStaged(): void {
    this.#clearStaged();
  }

  #clearStaged(): void {
    this.#stagedSeries = undefined;
    this.#stagedRange = undefined;
    this.#stagedBucket = undefined;
  }
}
