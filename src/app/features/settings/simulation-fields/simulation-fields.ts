import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { FormField, type FieldTree } from '@angular/forms/signals';
import {
  DEFAULT_LIVE_INTERVAL_MS,
  LIVE_INTERVAL_MS_RANGE,
} from '../../../core/settings/settings.store';
import { CsInputNumber } from '../../../shared/controls/input-number/input-number';
import { CsSlider } from '../../../shared/controls/slider/slider';

@Component({
  selector: 'app-simulation-fields',
  imports: [CsInputNumber, CsSlider, FormField],
  templateUrl: './simulation-fields.html',
  styleUrl: './simulation-fields.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SimulationFields {
  readonly liveIntervalMs = input.required<FieldTree<number | null>>();

  protected readonly intervalRange = LIVE_INTERVAL_MS_RANGE;

  protected readonly intervalSliderValue = computed(
    () => this.liveIntervalMs()().value() ?? DEFAULT_LIVE_INTERVAL_MS,
  );

  /** Direct writes bypass `FormField`, so dirtiness must be marked explicitly. */
  protected setFromSlider(field: FieldTree<number | null>, value: number): void {
    const state = field();
    state.value.set(value);
    state.markAsDirty();
  }
}
