import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  linkedSignal,
  output,
} from '@angular/core';

import { injectActiveLanguage } from '../../../core/i18n/active-language';
import { MAX_RANGE_MS, type BucketId } from '../../../core/data/series.catalog';
import { BUCKET_OPTIONS } from '../../../shared/bucket-options';
import { injectClock } from '../../../shared/clock';
import { FilterLayout } from '../../../shared/components/filter-shell/filter-layout';
import { CsDateRange, type DateRange } from '../../../shared/controls/date-range/date-range';
import {
  CsSegmentedControl,
  type SegmentedControlOption,
} from '../../../shared/controls/segmented-control/segmented-control';
import type { SelectOption } from '../../../shared/controls/select-option';
import { CsSelect } from '../../../shared/controls/select/select';
import {
  MINUTE_MS,
  RANGE_PRESET_IDS,
  RANGE_PRESET_SPANS,
  clampRangeStart,
  matchRangePreset,
  rangePresetLabelKey,
  rangePresetShortLabelKey,
  type RangePresetId,
  type TimeRange,
} from '../../../shared/time';

type BucketChoice = 'auto' | BucketId;
type RangePresetChoice = RangePresetId | 'custom';

const PRESET_TOLERANCE_MS = 2 * MINUTE_MS;

const CLOCK_INTERVAL_MS = MINUTE_MS;

const BUCKET_CHOICES: readonly SelectOption<BucketChoice>[] = [
  { value: 'auto', label: 'bucket.auto' },
  ...BUCKET_OPTIONS,
];

const RANGE_PRESET_OPTIONS: readonly SegmentedControlOption<RangePresetChoice>[] =
  RANGE_PRESET_IDS.map((id) => ({
    value: id,
    label: rangePresetLabelKey(id),
    shortLabel: rangePresetShortLabelKey(id),
  }));

const CUSTOM_RANGE = 'custom' as const;

@Component({
  selector: 'app-range-picker',
  imports: [CsDateRange, CsSegmentedControl, CsSelect],
  templateUrl: './range-picker.html',
  styleUrl: './range-picker.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RangePicker {
  readonly range = input.required<TimeRange>();
  readonly bucket = input.required<BucketId>();
  readonly rangeChange = output<TimeRange>();
  readonly bucketChange = output<BucketId>();
  readonly bucketReset = output<void>();

  readonly #now = injectClock(CLOCK_INTERVAL_MS);
  readonly #filterLayout = inject(FilterLayout);
  readonly #language = injectActiveLanguage();

  protected readonly presetOptions = RANGE_PRESET_OPTIONS;
  protected readonly bucketChoices = BUCKET_CHOICES;

  protected readonly maxDate = computed(() => new Date(this.#now()));
  protected readonly minDate = computed(() => new Date(this.#now() - MAX_RANGE_MS));

  protected readonly dateFormat = computed<string | undefined>(() => {
    if (this.#filterLayout.mode() !== 'sheet') {
      return undefined;
    }
    return this.#language() === 'pl' ? 'd.m' : 'm/d';
  });

  protected readonly activePreset = computed<RangePresetId | undefined>(() =>
    matchRangePreset(this.range(), PRESET_TOLERANCE_MS, this.#now()),
  );

  protected readonly activePresetChoice = computed<RangePresetChoice>(
    () => this.activePreset() ?? CUSTOM_RANGE,
  );

  protected readonly pickedDates = linkedSignal<TimeRange, DateRange>({
    source: this.range,
    computation: ({ from, to }) => ({ from: new Date(from), to: new Date(to) }),
  });

  readonly #overridden = linkedSignal<TimeRange, boolean>({
    source: this.range,
    computation: () => false,
  });

  /** Show the bucket returned by the facade because it may widen the requested value. */
  protected readonly bucketChoice = computed<BucketChoice>(() =>
    this.#overridden() ? this.bucket() : 'auto',
  );

  protected selectPreset(id: RangePresetId): void {
    // Use the click time so a coarse display clock cannot disable LIVE.
    const to = Date.now();
    this.rangeChange.emit({ from: to - RANGE_PRESET_SPANS[id], to });
  }

  protected onPresetPicked(choice: RangePresetChoice): void {
    if (choice !== CUSTOM_RANGE) {
      this.selectPreset(choice);
    }
  }

  protected onDatesPicked(dates: DateRange): void {
    this.pickedDates.set(dates);
    const { from, to } = dates;
    if (!from || !to) {
      return;
    }
    // Clamp to the wall clock because the simulator can generate future timestamps.
    const end = Math.min(to.getTime(), Date.now());
    const start = clampRangeStart(from.getTime(), end, MAX_RANGE_MS);
    if (end > start) {
      this.rangeChange.emit({ from: start, to: end });
    }
  }

  protected onBucketPicked(choice: BucketChoice): void {
    this.#overridden.set(choice !== 'auto');
    if (choice === 'auto') {
      this.bucketReset.emit();
    } else {
      this.bucketChange.emit(choice);
    }
  }
}
