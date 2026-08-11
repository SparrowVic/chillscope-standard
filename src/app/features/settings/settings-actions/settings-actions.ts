import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  input,
  output,
  viewChild,
} from '@angular/core';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { ConfirmationService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ConfirmPopupModule } from 'primeng/confirmpopup';

import { CsIcon } from '../../../shared/icons/cs-icon/cs-icon';

@Component({
  selector: 'app-settings-actions',
  imports: [ButtonModule, ConfirmPopupModule, CsIcon, TranslocoPipe],
  templateUrl: './settings-actions.html',
  styleUrl: './settings-actions.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.settings-actions--sticky]': 'dirty()',
  },
  providers: [ConfirmationService],
})
export class SettingsActions {
  readonly saveDisabled = input(false, { transform: booleanAttribute });
  readonly dirty = input(false, { transform: booleanAttribute });
  readonly invalid = input(false, { transform: booleanAttribute });
  readonly resetRequested = output<void>();

  readonly #confirmation = inject(ConfirmationService);
  readonly #transloco = inject(TranslocoService);

  /** The popup needs a stable DOM anchor; Angular queries cannot target an ES private field. */
  private readonly resetButton = viewChild.required<unknown, ElementRef<HTMLElement>>(
    'resetButton',
    { read: ElementRef },
  );

  protected confirmReset(): void {
    this.#confirmation.confirm({
      target: this.resetButton().nativeElement,
      message: this.#transloco.translate('settings.actions.resetConfirm'),
      acceptLabel: this.#transloco.translate('common.confirm'),
      rejectLabel: this.#transloco.translate('common.cancel'),
      accept: () => this.resetRequested.emit(),
    });
  }
}
