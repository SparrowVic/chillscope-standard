import {
  ChangeDetectionStrategy,
  Component,
  DOCUMENT,
  computed,
  inject,
  signal,
} from '@angular/core';
import { form, FormRoot } from '@angular/forms/signals';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';

import { SettingsStore } from '../../core/settings/settings.store';
import { PageHeader } from '../../shared/components/page-header/page-header';
import type { PendingChangesAware } from '../../shared/guards/pending-changes';
import { AppearanceFields } from './appearance-fields/appearance-fields';
import { SettingsActions } from './settings-actions/settings-actions';
import { settingsFormSchema, toFormValue, toLiveInterval } from './settings-form';
import { SimulationFields } from './simulation-fields/simulation-fields';
import { injectToast } from '../../shared/toasts';

@Component({
  selector: 'app-settings',
  imports: [
    AppearanceFields,
    FormRoot,
    PageHeader,
    SettingsActions,
    SimulationFields,
    ToastModule,
    TranslocoPipe,
  ],
  templateUrl: './settings.html',
  styleUrl: './settings.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [MessageService],
  host: { '(window:beforeunload)': 'onBeforeUnload($event)' },
})
export class Settings implements PendingChangesAware {
  readonly #settings = inject(SettingsStore);
  readonly #transloco = inject(TranslocoService);
  readonly #toast = injectToast();
  readonly #window = inject(DOCUMENT).defaultView;

  /** Do not derive this from the store because that would discard pending edits. */
  readonly #model = signal(this.#snapshot());

  protected readonly form = form(this.#model, settingsFormSchema, {
    submission: { action: async () => this.#persist() },
  });

  protected readonly saveDisabled = computed(() => {
    const state = this.form();
    return state.invalid() || !state.dirty();
  });

  protected readonly formDirty = computed(() => this.form().dirty());
  protected readonly formInvalid = computed(() => this.form().invalid());

  protected restoreDefaults(): void {
    this.#settings.reset();
    this.#reseed();
    if (this.#settings.persistenceFailed()) {
      this.#toast.warn('settings.actions.persistenceFailed');
    } else {
      this.#toast.success('settings.actions.resetDone');
    }
  }

  canDeactivate(): boolean {
    return (
      !this.form().dirty() ||
      (this.#window?.confirm(this.#transloco.translate('common.discardChanges')) ?? true)
    );
  }

  protected onBeforeUnload(event: BeforeUnloadEvent): void {
    if (this.form().dirty()) {
      event.preventDefault();
      event.returnValue = '';
    }
  }

  async #persist(): Promise<void> {
    const liveIntervalMs = toLiveInterval(this.#model());
    if (liveIntervalMs === undefined) {
      return;
    }
    this.#settings.setLiveIntervalMs(liveIntervalMs);

    this.#reseed();
    if (this.#settings.persistenceFailed()) {
      this.#toast.warn('settings.actions.persistenceFailed');
    } else {
      this.#toast.success('settings.actions.saved');
    }
  }

  /** Read back the stored value because the store may clamp it. */
  #reseed(): void {
    this.#model.set(this.#snapshot());
    this.form().reset();
  }

  #snapshot() {
    return toFormValue(this.#settings.liveIntervalMs());
  }
}
