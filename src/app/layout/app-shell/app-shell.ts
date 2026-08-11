import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';

import { AppNavigation } from '../navigation/navigation';
import { SystemStrip } from '../system-strip/system-strip';

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, TranslocoPipe, SystemStrip, AppNavigation],
  templateUrl: './app-shell.html',
  styleUrl: './app-shell.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppShell {}
