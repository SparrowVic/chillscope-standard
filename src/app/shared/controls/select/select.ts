import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslocoPipe } from '@jsverse/transloco';
import { SelectModule } from 'primeng/select';

import { BaseFormControl } from '../base-form-control';
import { ControlFrame } from '../control-frame/control-frame';
import { type SelectOption, translateOptions } from '../select-option';

@Component({
  selector: 'cs-select',
  imports: [ControlFrame, FormsModule, SelectModule, TranslocoPipe],
  templateUrl: './select.html',
  styleUrl: './select.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CsSelect<T> extends BaseFormControl<T> {
  readonly options = input.required<readonly SelectOption<T>[]>();
  readonly showClear = input(false, { transform: booleanAttribute });
  readonly filter = input(false, { transform: booleanAttribute });

  readonly ariaLabel = input<string>();

  readonly ariaDescribedBy = input<string>();

  readonly appendTo = input<'body' | 'self' | HTMLElement>('body');

  readonly literalLabels = input(false, { transform: booleanAttribute });

  readonly #translated = translateOptions(this.options);

  protected readonly resolvedOptions = computed(() =>
    this.literalLabels()
      ? this.options().map((option) => ({ ...option, text: option.label }))
      : this.#translated(),
  );

  protected readonly passThrough = computed(() => {
    const describedBy = this.ariaDescribedBy();
    return describedBy ? { label: { 'aria-describedby': describedBy } } : undefined;
  });
}
