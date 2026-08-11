import { booleanAttribute, computed, Directive, input, model } from '@angular/core';
import type {
  FormCheckboxControl,
  FormValueControl,
  ValidationError,
} from '@angular/forms/signals';

export type ControlSize = 'small' | 'normal' | 'large';

export type ControlValidationError = ValidationError.WithOptionalFieldTree;

export interface ControlFrameState {
  readonly labelId: string;
  readonly labelFor: string | undefined;
  readonly hintId: string;
  readonly errorId: string;
  readonly label: string | undefined;
  readonly hint: string | undefined;
  readonly tooltip: string | undefined;
  readonly required: boolean;
  readonly invalid: boolean;
  readonly errorKey: string | undefined;
  readonly errorParams: Record<string, unknown>;
}

let controlSequence = 0;

/** Shared Signal Forms state for value and checkbox wrappers. */
@Directive()
export abstract class BaseControl {
  readonly disabled = input(false, { transform: booleanAttribute });
  readonly required = input(false, { transform: booleanAttribute });
  readonly invalid = input(false, { transform: booleanAttribute });
  readonly errors = input<readonly ControlValidationError[]>([]);
  readonly touched = model(false);

  readonly label = input<string>();
  readonly hint = input<string>();
  readonly tooltip = input<string>();
  readonly placeholder = input<string>();

  readonly size = input<ControlSize>('small');

  readonly controlId = `cs-control-${++controlSequence}`;
  readonly labelId = `${this.controlId}-label`;
  readonly hintId = `${this.controlId}-hint`;
  readonly errorId = `${this.controlId}-error`;

  /** Widgets without a labellable element override this and use `aria-labelledby`. */
  protected readonly labelFor: string | undefined = this.controlId;

  protected readonly firstError = computed<ControlValidationError | undefined>(
    () => this.errors()[0],
  );

  protected readonly showError = computed(
    () => this.touched() && (this.invalid() || this.errors().length > 0),
  );

  protected readonly primeSize = computed<'small' | 'large' | undefined>(() => {
    const size = this.size();
    return size === 'normal' ? undefined : size;
  });

  protected readonly frame = computed<ControlFrameState>(() => {
    const error = this.showError() ? this.firstError() : undefined;
    return {
      labelId: this.labelId,
      labelFor: this.labelFor,
      hintId: this.hintId,
      errorId: this.errorId,
      label: this.label(),
      hint: this.hint(),
      tooltip: this.tooltip(),
      required: this.required(),
      invalid: this.showError(),
      errorKey: error ? errorTranslationKey(error) : undefined,
      errorParams: error ? errorTranslationParams(error) : {},
    };
  });

  protected readonly describedBy = computed<string | undefined>(() => {
    const frame = this.frame();
    if (frame.errorKey) {
      return this.errorId;
    }
    return frame.hint ? this.hintId : undefined;
  });

  /** Most PrimeNG controls do not expose `ariaDescribedBy`, so include it in the labelled-by chain. */
  protected readonly labelledBy = computed<string | undefined>(() => {
    const ids = [this.label() ? this.labelId : undefined, this.describedBy()].filter(
      (id): id is string => id !== undefined,
    );
    return ids.length > 0 ? ids.join(' ') : undefined;
  });
}

@Directive()
export abstract class BaseFormControl<T> extends BaseControl implements FormValueControl<T> {
  readonly value = model.required<T>();
}

@Directive()
export abstract class BaseCheckboxControl extends BaseControl implements FormCheckboxControl {
  readonly checked = model.required<boolean>();
}

function errorTranslationKey(error: ControlValidationError): string {
  return error.message ?? `validation.${error.kind}`;
}

const NON_PARAMETER_KEYS = new Set(['kind', 'message', 'fieldTree', 'formField']);

/** Preserve validator parameters used by translated error messages. */
function errorTranslationParams(error: ControlValidationError): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(error).filter(([key]) => !NON_PARAMETER_KEYS.has(key) && !key.startsWith('_')),
  );
}
