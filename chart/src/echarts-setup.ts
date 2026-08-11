import { HeatmapChart, LineChart } from 'echarts/charts';
import {
  DataZoomInsideComponent,
  DataZoomSliderComponent,
  GridComponent,
  LegendComponent,
  MarkAreaComponent,
  MarkLineComponent,
  TooltipComponent,
  VisualMapComponent,
} from 'echarts/components';
import { registerLocale, use } from 'echarts/core';
// The public UMD locale imports the full bundle; this ESM table does not.
import langPL from 'echarts/lib/i18n/langPL.js';
import { CanvasRenderer } from 'echarts/renderers';

use([
  LineChart,
  HeatmapChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  DataZoomInsideComponent,
  DataZoomSliderComponent,
  MarkLineComponent,
  MarkAreaComponent,
  VisualMapComponent,
  CanvasRenderer,
]);

// English is built in; Polish needs explicit registration.
registerLocale('PL', langPL);
