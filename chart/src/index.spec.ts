// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const vue = vi.hoisted(() => ({ defineCustomElement: vi.fn() }));
const components = vi.hoisted(() => ({
  measurement: { styles: ['.measurement-chart {}'] },
  heatmap: { styles: ['.cycle-heatmap {}'] },
}));

vi.mock('vue', () => ({ defineCustomElement: vue.defineCustomElement }));
vi.mock('./MeasurementChart/MeasurementChart.vue', () => ({ default: components.measurement }));
vi.mock('./CycleHeatmap/CycleHeatmap.vue', () => ({ default: components.heatmap }));

interface RegistryStub {
  readonly get: ReturnType<typeof vi.fn>;
  readonly define: ReturnType<typeof vi.fn>;
}

let registry: RegistryStub;

beforeEach(() => {
  vi.resetModules();
  document.head.replaceChildren();
  const elements = new Map<string, unknown>();
  registry = {
    get: vi.fn((tag: string) => elements.get(tag)),
    define: vi.fn((tag: string, element: unknown) => elements.set(tag, element)),
  };
  vi.stubGlobal('customElements', registry);
  vue.defineCustomElement.mockReset();
  vue.defineCustomElement.mockImplementation((component, options) => ({ component, options }));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('chart custom-element registration', () => {
  it('registers exactly the measurement chart and cycle heatmap in the light DOM', async () => {
    await import('./index');

    expect(registry.define.mock.calls.map(([tag]) => tag)).toEqual([
      'chillscope-chart',
      'chillscope-cycle-heatmap',
    ]);
    expect(vue.defineCustomElement).toHaveBeenNthCalledWith(1, components.measurement, {
      shadowRoot: false,
    });
    expect(vue.defineCustomElement).toHaveBeenNthCalledWith(2, components.heatmap, {
      shadowRoot: false,
    });
  });

  it('injects both SFC style payloads once and remains idempotent', async () => {
    const { registerChartElement } = await import('./index');

    registerChartElement();

    const styles = document.head.querySelectorAll('style[data-chillscope-chart]');
    expect(styles).toHaveLength(1);
    expect(styles[0].textContent).toContain('.measurement-chart {}');
    expect(styles[0].textContent).toContain('.cycle-heatmap {}');
    expect(registry.define).toHaveBeenCalledTimes(2);
  });
});
