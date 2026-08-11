import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterOutlet } from '@angular/router';
import { SwUpdate } from '@angular/service-worker';
import { TranslocoPipe } from '@jsverse/transloco';
import { filter } from 'rxjs';

const UPDATE_RELOAD_MS = 2_500;

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, TranslocoPipe],
  templateUrl: './app.html',
  styleUrl: './app.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  protected readonly updateReady = signal(false);

  constructor() {
    // Activate a staged service-worker version after showing the update notice.
    const updates = inject(SwUpdate);
    if (!updates.isEnabled) return;

    updates.versionUpdates
      .pipe(
        filter((event) => event.type === 'VERSION_READY'),
        takeUntilDestroyed(),
      )
      .subscribe(() => {
        this.updateReady.set(true);
        setTimeout(() => document.location.reload(), UPDATE_RELOAD_MS);
      });
  }
}
