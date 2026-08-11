import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  contentChild,
  DestroyRef,
  DOCUMENT,
  effect,
  type ElementRef,
  inject,
  Injector,
  input,
  output,
  signal,
  TemplateRef,
  viewChild,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { TranslocoPipe } from '@jsverse/transloco';

import { CsIcon } from '../../icons/cs-icon/cs-icon';
import { FilterLayout } from './filter-layout';

let filterShellSequence = 0;

@Component({
  selector: 'cs-filter-shell',
  imports: [NgTemplateOutlet, TranslocoPipe, CsIcon],
  templateUrl: './filter-shell.html',
  styleUrl: './filter-shell.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CsFilterShell {
  readonly label = input.required<string>();
  readonly activeCount = input(0);

  readonly applied = output<void>();
  readonly discarded = output<void>();
  readonly resetted = output<void>();

  readonly #document = inject(DOCUMENT);
  readonly #destroyRef = inject(DestroyRef);
  readonly #injector = inject(Injector);

  protected readonly controls = contentChild.required(TemplateRef);

  readonly mode = inject(FilterLayout).mode;
  readonly deferred = computed(() => this.mode() !== 'inline');

  protected readonly open = signal(false);
  protected readonly epoch = signal(0);
  protected readonly epochList = computed(() => [this.epoch()]);

  protected readonly titleId = `cs-filter-shell-${++filterShellSequence}-title`;

  protected readonly dialog = viewChild<ElementRef<HTMLElement>>('dialog');
  protected readonly entry = viewChild<ElementRef<HTMLButtonElement>>('entry');
  protected readonly portal = viewChild<ElementRef<HTMLElement>>('portal');

  #restoreFocusTo: HTMLElement | null = null;
  #previousBodyOverflow: string | null = null;
  #onDocumentPointerDown: ((event: PointerEvent) => void) | null = null;
  #portalElement: HTMLElement | null = null;

  constructor() {
    // Returning to the inline layout discards an open overlay draft.
    effect(() => {
      if (!this.deferred() && this.open()) {
        this.#close(true);
      }
    });

    this.#destroyRef.onDestroy(() => {
      this.#unlock();
      // The body-level portal is outside the component host and needs explicit cleanup.
      this.#portalElement?.remove();
      this.#portalElement = null;
    });
  }

  protected openOverlay(): void {
    if (this.open()) {
      return;
    }
    const active = this.#document.activeElement;
    this.#restoreFocusTo = active instanceof HTMLElement ? active : null;
    this.open.set(true);
    this.#lock();
    afterNextRender(
      {
        write: () => {
          // Moving the portal to body avoids transformed containing blocks. A native dialog would
          // cover PrimeNG overlays appended to body.
          const portal = this.portal()?.nativeElement;
          if (portal !== undefined && portal.parentElement !== this.#document.body) {
            this.#document.body.appendChild(portal);
            this.#portalElement = portal;
          }
          this.dialog()?.nativeElement.focus();
        },
      },
      { injector: this.#injector },
    );
  }

  protected applyAndClose(): void {
    this.applied.emit();
    this.#close(false);
  }

  protected cancelAndClose(): void {
    this.#close(true);
  }

  protected resetDraft(): void {
    this.epoch.update((epoch) => epoch + 1);
    this.resetted.emit();
  }

  protected onDialogKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      // PrimeNG overlays prevent the Escape event before it reaches this dialog.
      if (!event.defaultPrevented) {
        event.preventDefault();
        this.cancelAndClose();
      }
      return;
    }
    if (event.key === 'Tab') {
      this.#trapTab(event);
    }
  }

  #close(discarded: boolean): void {
    if (!this.open()) {
      return;
    }
    this.open.set(false);
    this.epoch.update((epoch) => epoch + 1);
    this.#unlock();
    if (discarded) {
      this.discarded.emit();
    }
    const target = this.#restoreFocusTo ?? this.entry()?.nativeElement ?? null;
    this.#restoreFocusTo = null;
    target?.focus();
  }

  #lock(): void {
    const body = this.#document.body;
    this.#previousBodyOverflow = body.style.overflow;
    body.style.overflow = 'hidden';

    const onPointerDown = (event: PointerEvent): void => {
      const dialog = this.dialog()?.nativeElement;
      const target = event.target;
      if (dialog === undefined || !(target instanceof Node)) {
        return;
      }
      // Body-appended PrimeNG overlays still belong to this editing session.
      if (dialog.contains(target)) {
        return;
      }
      const overlay =
        target instanceof Element
          ? target.closest(
              '.p-overlay, .p-select-overlay, .p-multiselect-overlay, .p-datepicker-panel, .p-confirmpopup, .p-toast',
            )
          : null;
      if (overlay !== null) {
        return;
      }
      this.cancelAndClose();
    };
    this.#document.addEventListener('pointerdown', onPointerDown, true);
    this.#onDocumentPointerDown = onPointerDown;
  }

  #unlock(): void {
    if (this.#previousBodyOverflow !== null) {
      this.#document.body.style.overflow = this.#previousBodyOverflow;
      this.#previousBodyOverflow = null;
    }
    if (this.#onDocumentPointerDown !== null) {
      this.#document.removeEventListener('pointerdown', this.#onDocumentPointerDown, true);
      this.#onDocumentPointerDown = null;
    }
  }

  #trapTab(event: KeyboardEvent): void {
    const dialog = this.dialog()?.nativeElement;
    if (dialog === undefined) {
      return;
    }
    const tabbables = Array.from(
      dialog.querySelectorAll<HTMLElement>(
        'a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])',
      ),
    ).filter(
      (element) => element.getClientRects().length > 0 || element === this.#document.activeElement,
    );
    if (tabbables.length === 0) {
      event.preventDefault();
      return;
    }
    const first = tabbables[0];
    const last = tabbables[tabbables.length - 1];
    const active = this.#document.activeElement;
    if (event.shiftKey && (active === first || active === dialog)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  }
}
