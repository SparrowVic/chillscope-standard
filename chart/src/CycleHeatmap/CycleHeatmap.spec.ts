// @vitest-environment jsdom

import { defineCustomElement, nextTick } from 'vue';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import CycleHeatmap from './CycleHeatmap.vue';
import type { HeatmapMatrix } from '../types';

const echarts = vi.hoisted(() => ({ init: vi.fn() }));

vi.mock('echarts/core', () => ({ init: echarts.init }));
vi.mock('../echarts-setup', () => ({}));

const TAG_NAME = 'test-cycle-heatmap';
const DAY = Date.UTC(2026, 7, 3);
const MATRIX: HeatmapMatrix = {
  days: [DAY],
  values: Array.from({ length: 24 }, (_, hour) => 18 + hour / 10),
  label: 'Temperature',
  unit: '°C',
  color: '#d75b3b',
};

interface HeatmapElement extends HTMLElement {
  matrix: HeatmapMatrix;
  locale?: string;
}

let frames: Map<number, FrameRequestCallback>;
let nextFrameId: number;
const observer = { observe: vi.fn(), disconnect: vi.fn() };
const chart = {
  setOption: vi.fn(),
  resize: vi.fn(),
  dispose: vi.fn(),
};

beforeAll(() => {
  if (!customElements.get(TAG_NAME)) {
    customElements.define(TAG_NAME, defineCustomElement(CycleHeatmap, { shadowRoot: false }));
  }
});

beforeEach(() => {
  frames = new Map();
  nextFrameId = 1;
  echarts.init.mockReturnValue(chart);
  Object.values(chart).forEach((method) => method.mockClear());
  observer.observe.mockClear();
  observer.disconnect.mockClear();

  vi.stubGlobal(
    'requestAnimationFrame',
    vi.fn((callback: FrameRequestCallback) => {
      const id = nextFrameId++;
      frames.set(id, callback);
      return id;
    }),
  );
  vi.stubGlobal(
    'cancelAnimationFrame',
    vi.fn((id: number) => {
      frames.delete(id);
    }),
  );
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe = observer.observe;
      disconnect = observer.disconnect;
    },
  );
});

afterEach(async () => {
  document.body.replaceChildren();
  await nextTick();
  vi.unstubAllGlobals();
  echarts.init.mockReset();
});

async function mountHeatmap(): Promise<HeatmapElement> {
  const element = document.createElement(TAG_NAME) as HeatmapElement;
  element.matrix = MATRIX;
  document.body.append(element);
  await nextTick();
  return element;
}

function flushFrames(): void {
  const pending = [...frames.values()];
  frames.clear();
  pending.forEach((callback) => callback(performance.now()));
}

describe('CycleHeatmap lifecycle', () => {
  it('creates one responsive ECharts instance and renders the complete matrix', async () => {
    const element = await mountHeatmap();

    expect(echarts.init).toHaveBeenCalledOnce();
    expect(observer.observe).toHaveBeenCalledWith(element.querySelector('.heatmap__canvas'));

    flushFrames();

    expect(chart.setOption).toHaveBeenCalledOnce();
    expect(chart.setOption.mock.calls[0][1]).toEqual({ notMerge: true });
    expect(chart.setOption.mock.calls[0][0]).toMatchObject({
      series: [{ type: 'heatmap' }],
    });
  });

  it('coalesces reactive input changes into one scheduled redraw', async () => {
    const element = await mountHeatmap();
    flushFrames();
    chart.setOption.mockClear();

    element.matrix = { ...MATRIX, values: MATRIX.values.map((value) => Number(value) + 1) };
    element.locale = 'pl';
    await nextTick();

    expect(frames.size).toBe(1);
    flushFrames();
    expect(chart.setOption).toHaveBeenCalledOnce();
  });

  it('disconnects observation, cancels pending work and disposes ECharts on removal', async () => {
    const element = await mountHeatmap();
    expect(frames.size).toBe(1);

    element.remove();
    await nextTick();

    expect(frames.size).toBe(0);
    expect(observer.disconnect).toHaveBeenCalledOnce();
    expect(chart.dispose).toHaveBeenCalledOnce();
  });
});
