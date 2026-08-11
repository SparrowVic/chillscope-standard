import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import {
  faArrowRotateRight,
  faCheck,
  faCircleExclamation,
  faCircleInfo,
  faFilter,
  faGaugeHigh,
  faMoon,
  faSliders,
  faSun,
  faTowerBroadcast,
  faTriangleExclamation,
  faWaveSquare,
  faXmark,
} from '@fortawesome/free-solid-svg-icons';

export const ICON_ROSTER = {
  'gauge-high': faGaugeHigh,
  sliders: faSliders,
  'wave-pulse': faWaveSquare,
  'tower-broadcast': faTowerBroadcast,
  'triangle-exclamation': faTriangleExclamation,
  'circle-exclamation': faCircleExclamation,
  'circle-info': faCircleInfo,
  filter: faFilter,
  xmark: faXmark,
  'arrow-rotate-right': faArrowRotateRight,
  check: faCheck,
  moon: faMoon,
  sun: faSun,
} as const satisfies Record<string, IconDefinition>;

export type CsIconName = keyof typeof ICON_ROSTER;
