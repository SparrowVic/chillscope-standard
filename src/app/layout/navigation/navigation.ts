import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';

import { CsIcon } from '../../shared/icons/cs-icon/cs-icon';
import type { CsIconName } from '../../shared/icons/icon-roster';

interface NavigationItem {
  readonly route: string;
  readonly labelKey: string;
  readonly icon: CsIconName;
}

const NAVIGATION_ITEMS: readonly NavigationItem[] = [
  {
    route: '/dashboard',
    labelKey: 'menu.dashboard',
    icon: 'gauge-high',
  },
  {
    route: '/settings',
    labelKey: 'menu.settings',
    icon: 'sliders',
  },
];

@Component({
  selector: 'app-navigation',
  imports: [RouterLink, RouterLinkActive, TranslocoPipe, CsIcon],
  templateUrl: './navigation.html',
  styleUrl: './navigation.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppNavigation {
  protected readonly items = NAVIGATION_ITEMS;
}
