import '@chillscope/chart';

import {
  ChangeDetectionStrategy,
  Component,
  computed,
  CUSTOM_ELEMENTS_SCHEMA,
  inject,
  input,
} from '@angular/core';
import type { ChartTheme, HeatmapLabels, HeatmapMatrix } from '@chillscope/chart/types';
import { TranslocoPipe } from '@jsverse/transloco';

import { CYCLE_DAY_CHOICES, CycleFacade, type CycleDays } from '../../../core/data/cycle.facade';
import { MeasurementsFacade } from '../../../core/data/measurements.facade';
import type { SeriesId } from '../../../core/data/measurement.models';
import { injectActiveLanguage } from '../../../core/i18n/active-language';
import { injectTranslator } from '../../../core/i18n/translator';
import { ErrorPanel } from '../../../shared/components/error-panel/error-panel';
import {
  CsSegmentedControl,
  type SegmentedControlOption,
} from '../../../shared/controls/segmented-control/segmented-control';
import { SERIES_LABEL_KEYS } from '../../../shared/series-display';
import { injectSeriesLabels, injectSeriesUnits } from '../series-labels';

const SERIES_OPTIONS: readonly SegmentedControlOption<SeriesId>[] = (
  Object.keys(SERIES_LABEL_KEYS) as SeriesId[]
).map((id) => ({ value: id, label: SERIES_LABEL_KEYS[id] }));

const DAY_OPTIONS: readonly SegmentedControlOption<CycleDays>[] = CYCLE_DAY_CHOICES.map((days) => ({
  value: days,
  label: `dashboard.cycle.days${days}`,
}));

@Component({
  selector: 'app-cycle-panel',
  imports: [CsSegmentedControl, ErrorPanel, TranslocoPipe],
  templateUrl: './cycle-panel.html',
  styleUrl: './cycle-panel.css',
  host: { class: 'cs-panel' },
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CyclePanel {
  readonly theme = input.required<ChartTheme>();

  protected readonly cycle = inject(CycleFacade);
  readonly #measurements = inject(MeasurementsFacade);
  readonly #seriesLabels = injectSeriesLabels();
  readonly #seriesUnits = injectSeriesUnits();
  readonly #translator = injectTranslator();

  protected readonly language = injectActiveLanguage();
  protected readonly seriesOptions = SERIES_OPTIONS;
  protected readonly dayOptions = DAY_OPTIONS;

  readonly #color = computed<string | undefined>(
    () => this.#measurements.catalogue().find((entry) => entry.id === this.cycle.seriesId())?.color,
  );

  protected readonly matrix = computed<HeatmapMatrix | undefined>(() => {
    const color = this.#color();
    if (color === undefined) {
      return undefined;
    }

    const id = this.cycle.seriesId();
    const fold = this.cycle.fold();
    return {
      days: fold.days,
      values: fold.values,
      label: this.#seriesLabels()[id],
      unit: this.#seriesUnits()[id],
      color,
    };
  });

  protected readonly labels = computed<HeatmapLabels>(() => {
    const translate = this.#translator();
    return {
      empty: translate('chart.empty'),
      loading: translate('chart.loading'),
      ariaLabel: translate('dashboard.cycle.ariaLabel'),
    };
  });
}
