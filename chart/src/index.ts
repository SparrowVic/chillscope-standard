import { defineCustomElement } from 'vue';
import CycleHeatmap from './CycleHeatmap/CycleHeatmap.vue';
import MeasurementChart from './MeasurementChart/MeasurementChart.vue';

const ELEMENTS = [
  { tag: 'chillscope-chart', component: MeasurementChart },
  { tag: 'chillscope-cycle-heatmap', component: CycleHeatmap },
] as const;

const STYLE_MARKER = 'data-chillscope-chart';

/** Vue does not inject SFC styles for these light-DOM custom elements. */
function injectStyles(): void {
  if (document.head.querySelector(`style[${STYLE_MARKER}]`)) {
    return;
  }
  const styles = ELEMENTS.flatMap(
    ({ component }) => (component as unknown as { styles?: readonly string[] }).styles ?? [],
  );
  const element = document.createElement('style');
  element.setAttribute(STYLE_MARKER, '');
  element.textContent = styles.join('\n');
  document.head.append(element);
}

export function registerChartElement(): void {
  injectStyles();
  for (const { tag, component } of ELEMENTS) {
    if (!customElements.get(tag)) {
      customElements.define(tag, defineCustomElement(component, { shadowRoot: false }));
    }
  }
}

registerChartElement();

export * from './types';
