import { init, use } from 'echarts/core';
import { SVGRenderer } from 'echarts/renderers';
import { describe, expect, it } from 'vitest';

import { buildChartOption, themeTokens } from './chart-option';
import './echarts-setup';
import type { ChartSeries } from './types';

use([SVGRenderer]);

const HOUR = 60 * 60 * 1000;
const START = Date.UTC(2026, 7, 13);
const SERIES: readonly ChartSeries[] = [
  ['temperature', 'Temperature', '°C', '#d75b3b', 18],
  ['pressure', 'Pressure', 'bar', '#4c8ccf', 2],
  ['flow', 'Flow', 'm³/h', '#45a06d', 12],
  ['rpm', 'RPM', 'rpm', '#a277c7', 800],
].map(([id, label, unit, color, base]) => ({
  id: id as ChartSeries['id'],
  label: String(label),
  unit: String(unit),
  color: String(color),
  t: Array.from({ length: 24 }, (_, index) => START + index * HOUR),
  v: Array.from({ length: 24 }, (_, index) => Number(base) + Math.sin(index / 3)),
}));

function dataZoomTypes(chart: ReturnType<typeof init>): readonly unknown[] {
  return ((chart.getOption().dataZoom ?? []) as readonly { readonly type?: unknown }[]).map(
    (entry) => entry.type,
  );
}

describe('measurement chart responsive ECharts scene', () => {
  it('renders every series at compact width and keeps them through compact/wide rotation', () => {
    const chart = init(null, null, { renderer: 'svg', ssr: true, width: 316, height: 320 });
    chart.setOption(
      buildChartOption({
        series: SERIES,
        tokens: themeTokens('light'),
        locale: 'en',
      }),
      { replaceMerge: ['series', 'yAxis'] },
    );

    const compact = chart.renderToSVGString();
    for (const entry of SERIES) {
      expect(compact).toContain(entry.color);
    }
    expect((chart.getOption().series as unknown[]).length).toBe(4);

    chart.resize({ width: 800, height: 320 });
    const wide = chart.renderToSVGString();
    for (const entry of SERIES) {
      expect(wide).toContain(entry.color);
    }
    expect(wide).toContain('Temperature');

    chart.resize({ width: 316, height: 320 });
    const compactAgain = chart.renderToSVGString();
    for (const entry of SERIES) {
      expect(compactAgain).toContain(entry.color);
    }

    chart.dispose();
  });

  it('replaces four compact series with one without blanking the plot', () => {
    const chart = init(null, null, { renderer: 'svg', ssr: true, width: 316, height: 320 });
    const input = {
      tokens: themeTokens('light'),
      locale: 'en',
    } as const;
    chart.setOption(buildChartOption({ ...input, series: SERIES }), {
      replaceMerge: ['series', 'yAxis'],
    });

    chart.setOption(buildChartOption({ ...input, series: [SERIES[0]] }), {
      replaceMerge: ['series', 'yAxis'],
    });

    expect((chart.getOption().series as unknown[]).length).toBe(1);
    const single = chart.renderToSVGString();
    expect(single).toContain(SERIES[0].color);
    for (const entry of SERIES.slice(1)) {
      expect(single).not.toContain(entry.color);
    }

    chart.dispose();
  });

  it('keeps the inside zoom and slider when a selected range replaces dataZoom', () => {
    const chart = init(null, null, { renderer: 'svg', ssr: true, width: 316, height: 320 });
    const input = {
      tokens: themeTokens('light'),
      locale: 'en',
    } as const;
    chart.setOption(buildChartOption({ ...input, series: SERIES }), {
      replaceMerge: ['series', 'yAxis', 'dataZoom'],
    });
    chart.dispatchAction({ type: 'dataZoom', start: 25, end: 75 });

    chart.setOption(buildChartOption({ ...input, series: [SERIES[0]] }), {
      replaceMerge: ['series', 'yAxis', 'dataZoom'],
    });

    expect(dataZoomTypes(chart)).toEqual(['inside', 'slider']);

    chart.resize({ width: 800, height: 320 });
    expect(dataZoomTypes(chart)).toEqual(['inside', 'slider']);

    chart.resize({ width: 316, height: 320 });
    expect(dataZoomTypes(chart)).toEqual(['inside', 'slider']);

    chart.dispose();
  });
});
