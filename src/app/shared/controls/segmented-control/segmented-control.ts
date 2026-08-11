import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';

import { BaseFormControl } from '../base-form-control';
import { ControlFrame } from '../control-frame/control-frame';
import type { SelectOption } from '../select-option';

export interface SegmentedControlOption<T> extends SelectOption<T> {
  readonly shortLabel?: string;
}

interface RenderedSegment<T> extends SegmentedControlOption<T> {
  readonly selected: boolean;
}

@Component({
  selector: 'cs-segmented-control',
  imports: [ControlFrame, TranslocoPipe],
  templateUrl: './segmented-control.html',
  styleUrl: './segmented-control.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CsSegmentedControl<T> extends BaseFormControl<T> {
  readonly options = input.required<readonly SegmentedControlOption<T>[]>();
  readonly numeric = input(false, { transform: booleanAttribute });
  /** Emits repeated activation of the current value. */
  readonly selected = output<T>();

  protected override readonly labelFor = undefined;

  protected readonly renderedOptions = computed<readonly RenderedSegment<T>[]>(() => {
    const selectedValue = this.value();
    return this.options().map((option) => ({
      ...option,
      selected: Object.is(option.value, selectedValue),
    }));
  });

  protected select(option: RenderedSegment<T>): void {
    if (!this.disabled() && !option.disabled) {
      this.value.set(option.value);
      this.selected.emit(option.value);
    }
  }

  protected onFocusOut(event: FocusEvent): void {
    const group = event.currentTarget;
    const next = event.relatedTarget;
    if (group instanceof HTMLElement && !(next instanceof Node && group.contains(next))) {
      this.touched.set(true);
    }
  }
}
