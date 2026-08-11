import { ChangeDetectionStrategy, Component, model } from '@angular/core';

import { CsSwitch } from '../../controls/switch/switch';

@Component({
  selector: 'app-live-toggle',
  imports: [CsSwitch],
  templateUrl: './live-toggle.html',
  styleUrl: './live-toggle.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class.live-toggle--on]': 'enabled()' },
})
export class LiveToggle {
  readonly enabled = model.required<boolean>();
}
