import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  DOCUMENT,
  inject,
  signal,
} from '@angular/core';
import type { RangeSelectedDetail } from '@chillscope/chart/types';
import { TranslocoPipe } from '@jsverse/transloco';
import { SkeletonModule } from 'primeng/skeleton';

import { MeasurementsFacade } from '../../core/data/measurements.facade';
import { SettingsStore } from '../../core/settings/settings.store';
import { ErrorPanel } from '../../shared/components/error-panel/error-panel';
import { LiveToggle } from '../../shared/components/live-toggle/live-toggle';
import { PageHeader } from '../../shared/components/page-header/page-header';
import { ChartPanel } from './chart-panel/chart-panel';
import { CyclePanel } from './cycle-panel/cycle-panel';
import { DashboardFilters } from './dashboard-filters/dashboard-filters';

@Component({
  selector: 'app-dashboard',
  imports: [
    ChartPanel,
    CyclePanel,
    DashboardFilters,
    ErrorPanel,
    LiveToggle,
    PageHeader,
    SkeletonModule,
    TranslocoPipe,
  ],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Dashboard {
  protected readonly measurements = inject(MeasurementsFacade);
  protected readonly theme = inject(SettingsStore).theme;

  readonly #window = inject(DOCUMENT).defaultView;

  constructor() {
    const releaseLive = this.measurements.activateLive();
    inject(DestroyRef).onDestroy(releaseLive);
  }

  readonly #chartRangeHistory = signal<readonly RangeSelectedDetail[]>([]);

  protected readonly chartZoomDepth = computed(() => this.#chartRangeHistory().length);
  protected readonly chartResetKey = signal(0);

  protected onChartRangeSelected(range: RangeSelectedDetail): void {
    const current = this.measurements.range();
    if (range.from === current.from && range.to === current.to) {
      return;
    }
    this.#chartRangeHistory.update((history) => [...history, current]);
    this.measurements.setRange(range.from, range.to);
  }

  protected onFilterRangeChange(from: number, to: number): void {
    this.#chartRangeHistory.set([]);
    this.chartResetKey.update((key) => key + 1);
    this.measurements.setRange(from, to);
  }

  protected undoChartRange(): void {
    const history = this.#chartRangeHistory();
    const previous = history.at(-1);
    if (previous === undefined) {
      return;
    }
    this.#chartRangeHistory.set(history.slice(0, -1));
    this.chartResetKey.update((key) => key + 1);
    this.measurements.setRange(previous.from, previous.to);
  }

  protected restoreChartRange(): void {
    const initial = this.#chartRangeHistory().at(0);
    if (initial === undefined) {
      return;
    }
    this.#chartRangeHistory.set([]);
    this.chartResetKey.update((key) => key + 1);
    this.measurements.setRange(initial.from, initial.to);
  }

  protected reloadPage(): void {
    this.#window?.location.reload();
  }
}
