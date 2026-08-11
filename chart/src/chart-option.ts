import type { LineSeriesOption } from 'echarts/charts';
import type {
  DataZoomComponentOption,
  GridComponentOption,
  LegendComponentOption,
  TooltipComponentOption,
  VisualMapComponentOption,
} from 'echarts/components';
import type { ComposeOption } from 'echarts/core';
import type { ChartSeries, ChartTheme, ChartThresholds, SeriesThresholdBand } from './types';

export type MeasurementChartOption = ComposeOption<
  | LineSeriesOption
  | GridComponentOption
  | TooltipComponentOption
  | LegendComponentOption
  | DataZoomComponentOption
  | VisualMapComponentOption
>;

/** Canvas text does not inherit the page font stack. */
const FONT_MONO = "'Geist Mono', ui-monospace, SFMono-Regular, Menlo, monospace";
const FONT_SANS = "'Geist Sans', ui-sans-serif, system-ui, 'Segoe UI', sans-serif";

export interface ChartThemeTokens {
  readonly text: string;
  readonly muted: string;
  readonly hairline: string;
  readonly hairlineStrong: string;
  readonly surface: string;
  readonly accent: string;
  readonly warning: string;
  readonly critical: string;
}

export interface ChartOptionInput {
  readonly series: readonly ChartSeries[];
  readonly thresholds?: ChartThresholds;
  readonly tokens: ChartThemeTokens;
  readonly locale: string;
}

const AXIS_WIDTH = 54;
const AXIS_GUTTER = 14;
/** Shared by the ECharts grid and the DOM brush overlay. */
export const GRID_TOP = 46;
export const GRID_BOTTOM = 60;
/**
 * Four full axes leave too little plot width below this point. The media query uses the canvas
 * width, after shell and panel padding.
 */
const COMPACT_MAX_WIDTH = 520;
const COMPACT_AXIS_WIDTH = 42;
const COMPACT_AXIS_GUTTER = 10;
const BOUNDS_PADDING = 0.08;
/** Matches ECharts' default splitNumber. */
const AXIS_SPLITS = 5;
const AXIS_NAME_GAP = 6;
const THRESHOLD_LINE_ALPHA = 0.75;
const CRITICAL_ZONE_ALPHA = 0.07;
const WARNING_ZONE_ALPHA = 0.045;
const ACCENT_WINDOW_ALPHA = 0.12;

const VALUE_OPTIONS: Intl.NumberFormatOptions = { maximumFractionDigits: 2 };
const TIMESTAMP_OPTIONS: Intl.DateTimeFormatOptions = { dateStyle: 'short', timeStyle: 'short' };

function withAlpha(hex: string, alpha: number): string {
  const value = hex.replace('#', '');
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

const HAIRLINE_BASE = '#5d636b';

/** Canvas rendering receives a stable snapshot because CSS custom properties can change mid-frame. */
const THEME_TOKENS: Readonly<Record<ChartTheme, ChartThemeTokens>> = {
  light: {
    text: '#1b1d20',
    muted: '#5d636b',
    hairline: withAlpha(HAIRLINE_BASE, 0.18),
    hairlineStrong: withAlpha(HAIRLINE_BASE, 0.42),
    surface: '#ffffff',
    accent: '#1b1d20',
    warning: '#875800',
    critical: '#cb3038',
  },
  dark: {
    text: '#dfe1e4',
    muted: '#9ba0a7',
    hairline: withAlpha(HAIRLINE_BASE, 0.22),
    hairlineStrong: withAlpha(HAIRLINE_BASE, 0.42),
    surface: '#2c2e32',
    accent: '#e9ebee',
    warning: '#f0a93e',
    critical: '#ff5f57',
  },
};

export function themeTokens(theme: ChartTheme): ChartThemeTokens {
  return THEME_TOKENS[theme];
}

interface UnitAxis {
  readonly unit: string;
  readonly members: readonly ChartSeries[];
  readonly min: number;
  readonly max: number;
}

function groupByUnit(
  series: readonly ChartSeries[],
  thresholds: ChartThresholds | undefined,
): UnitAxis[] {
  const groups = new Map<string, ChartSeries[]>();
  for (const entry of series) {
    const members = groups.get(entry.unit);
    if (members) {
      members.push(entry);
    } else {
      groups.set(entry.unit, [entry]);
    }
  }
  // A cartesian grid without a value axis leaves ECharts unable to lay out, so the empty state
  // still needs one placeholder axis.
  if (groups.size === 0) {
    return [{ unit: '', members: [], min: 0, max: 1 }];
  }
  return [...groups].map(([unit, members]) => ({
    unit,
    members,
    ...boundsFor(members, thresholds),
  }));
}

function boundsFor(
  members: readonly ChartSeries[],
  thresholds: ChartThresholds | undefined,
): { min: number; max: number } {
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  for (const entry of members) {
    for (const value of entry.v) {
      if (value < min) min = value;
      if (value > max) max = value;
    }
    const band = thresholds?.[entry.id];
    if (band) {
      min = Math.min(min, band.criticalMin, band.warningMin);
      max = Math.max(max, band.criticalMax, band.warningMax);
    }
  }
  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    return { min: 0, max: 1 };
  }
  const padding = (max - min || Math.abs(max) || 1) * BOUNDS_PADDING;
  // ECharts prints explicit min/max values, so round the padded bounds to the tick step.
  const step = niceStep(max - min + 2 * padding);
  return {
    min: trimFloat(Math.floor((min - padding) / step) * step),
    max: trimFloat(Math.ceil((max + padding) / step) * step),
  };
}

/** Uses the 1, 2, 5, 10 step sequence for readable axis ticks. */
function niceStep(span: number): number {
  const raw = span / AXIS_SPLITS;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const normalised = raw / magnitude;
  const factor = normalised > 5 ? 10 : normalised > 2 ? 5 : normalised > 1 ? 2 : 1;
  return factor * magnitude;
}

/** Removes floating-point noise from explicit axis bounds. */
function trimFloat(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function axisPlacement(index: number): { position: 'left' | 'right'; offset: number } {
  return {
    position: index % 2 === 0 ? 'left' : 'right',
    offset: Math.floor(index / 2) * AXIS_WIDTH,
  };
}

function thresholdLines(
  band: SeriesThresholdBand,
  tokens: ChartThemeTokens,
): LineSeriesOption['markLine'] {
  const warning = withAlpha(tokens.warning, THRESHOLD_LINE_ALPHA);
  const critical = withAlpha(tokens.critical, THRESHOLD_LINE_ALPHA);
  return {
    silent: true,
    symbol: 'none',
    animation: false,
    /* Threshold labels overlap when several series have nearby limits. */
    label: { show: false },
    lineStyle: { type: 'dashed', width: 1 },
    data: [
      { yAxis: band.warningMax, lineStyle: { color: warning }, label: { color: tokens.warning } },
      { yAxis: band.warningMin, lineStyle: { color: warning }, label: { color: tokens.warning } },
      {
        yAxis: band.criticalMax,
        lineStyle: { color: critical },
        label: { color: tokens.critical },
      },
      {
        yAxis: band.criticalMin,
        lineStyle: { color: critical },
        label: { color: tokens.critical },
      },
    ],
  };
}

function severityZones(
  band: SeriesThresholdBand,
  axis: UnitAxis,
  tokens: ChartThemeTokens,
): LineSeriesOption['markArea'] {
  return {
    silent: true,
    animation: false,
    data: [
      [
        {
          yAxis: band.criticalMax,
          itemStyle: { color: tokens.critical, opacity: CRITICAL_ZONE_ALPHA },
        },
        { yAxis: axis.max },
      ],
      [
        { yAxis: axis.min, itemStyle: { color: tokens.critical, opacity: CRITICAL_ZONE_ALPHA } },
        { yAxis: band.criticalMin },
      ],
      [
        {
          yAxis: band.warningMax,
          itemStyle: { color: tokens.warning, opacity: WARNING_ZONE_ALPHA },
        },
        { yAxis: band.criticalMax },
      ],
      [
        {
          yAxis: band.criticalMin,
          itemStyle: { color: tokens.warning, opacity: WARNING_ZONE_ALPHA },
        },
        { yAxis: band.warningMin },
      ],
    ],
  };
}

function severityMap(
  band: SeriesThresholdBand,
  seriesIndex: number,
  color: string,
  tokens: ChartThemeTokens,
): VisualMapComponentOption {
  return {
    type: 'piecewise',
    show: false,
    dimension: 1,
    seriesIndex,
    pieces: [
      { lt: band.criticalMin, color: tokens.critical },
      { gte: band.criticalMin, lt: band.warningMin, color: tokens.warning },
      { gte: band.warningMin, lte: band.warningMax, color },
      { gt: band.warningMax, lte: band.criticalMax, color: tokens.warning },
      { gt: band.criticalMax, color: tokens.critical },
    ],
  };
}

function lastValueByLabel(
  series: readonly ChartSeries[],
  locale: string,
): ReadonlyMap<string, string> {
  const format = new Intl.NumberFormat(locale, VALUE_OPTIONS);
  return new Map(
    series
      .filter((entry) => entry.v.length > 0)
      .map((entry) => {
        const value = format.format(entry.v[entry.v.length - 1]);
        return [entry.label, entry.unit ? `${value} ${entry.unit}` : value];
      }),
  );
}

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"]/g,
    (character) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[character] ?? character,
  );
}

function severityOf(
  value: number,
  band: SeriesThresholdBand | undefined,
): 'warning' | 'critical' | null {
  if (!band) {
    return null;
  }
  if (value < band.criticalMin || value > band.criticalMax) {
    return 'critical';
  }
  return value < band.warningMin || value > band.warningMax ? 'warning' : null;
}

function tooltipFormatter(
  units: ReadonlyMap<string, string>,
  thresholds: ChartThresholds | undefined,
  locale: string,
  tokens: ChartThemeTokens,
): TooltipComponentOption['formatter'] {
  const timestampFormat = new Intl.DateTimeFormat(locale, TIMESTAMP_OPTIONS);
  const valueFormat = new Intl.NumberFormat(locale, VALUE_OPTIONS);
  return (params) => {
    const rows = Array.isArray(params) ? params : [params];
    const first = rows[0];
    if (!first || !Array.isArray(first.value)) {
      return '';
    }
    const heading =
      `<div style="font-family:${FONT_MONO};font-size:11px;color:${tokens.muted};` +
      `margin-bottom:4px;">${escapeHtml(timestampFormat.format(Number(first.value[0])))}</div>`;
    const lines = rows.map((row) => {
      const value = Array.isArray(row.value) ? Number(row.value[1]) : Number(row.value);
      const name = String(row.seriesName ?? '');
      const unit = units.get(name) ?? '';
      const unitSuffix = unit
        ? ` <span style="font-size:10px;color:${tokens.muted};">${escapeHtml(unit)}</span>`
        : '';
      const severity = severityOf(value, thresholds?.[String(row.seriesId ?? '')]);
      const valueColor =
        severity === 'critical'
          ? tokens.critical
          : severity === 'warning'
            ? tokens.warning
            : tokens.text;
      return (
        '<div style="display:flex;align-items:center;justify-content:space-between;' +
        'gap:16px;line-height:1.7;">' +
        `<span style="display:inline-flex;align-items:center;">${row.marker ?? ''}` +
        `<span style="font-family:${FONT_SANS};font-size:12px;">${escapeHtml(name)}</span></span>` +
        `<span style="font-family:${FONT_MONO};font-size:12px;color:${valueColor};` +
        `font-variant-numeric:tabular-nums;">${valueFormat.format(value)}${unitSuffix}</span>` +
        '</div>'
      );
    });
    return heading + lines.join('');
  };
}

export function buildChartOption(input: ChartOptionInput): MeasurementChartOption {
  const { series, thresholds, tokens, locale } = input;
  const axes = groupByUnit(series, thresholds);
  const axisIndexByUnit = new Map(axes.map((axis, index) => [axis.unit, index]));
  const leftCount = Math.ceil(axes.length / 2);
  const rightCount = Math.floor(axes.length / 2);
  const compactLeft = COMPACT_AXIS_GUTTER + (axes.length > 0 ? COMPACT_AXIS_WIDTH : 0);
  const compactRight = COMPACT_AXIS_GUTTER + (axes.length > 1 ? COMPACT_AXIS_WIDTH : 0);
  const lastValues = lastValueByLabel(series, locale);
  const severityMaps = series.flatMap((entry, index) => {
    const band = thresholds?.[entry.id];
    return band ? [severityMap(band, index, entry.color, tokens)] : [];
  });
  const chartAxes = axes.map((axis, index) => ({
    type: 'value' as const,
    name: axis.unit,
    nameGap: AXIS_NAME_GAP,
    nameTextStyle: { color: tokens.muted, fontFamily: FONT_MONO, fontSize: 10 },
    min: axis.min,
    max: axis.max,
    ...axisPlacement(index),
    axisLabel: {
      color: tokens.muted,
      fontFamily: FONT_MONO,
      fontSize: 11,
      hideOverlap: true,
      formatter: (value: number) => String(trimFloat(value)),
    },
    axisLine: { show: true, lineStyle: { color: tokens.hairline } },
    axisTick: { show: false },
    // Showing split lines for every value axis would draw them on top of each other.
    splitLine: { show: index === 0, lineStyle: { color: tokens.hairline } },
  }));
  const chartSeries = series.map((entry) => {
    const unitIndex = axisIndexByUnit.get(entry.unit) ?? 0;
    const band = thresholds?.[entry.id];
    return {
      id: entry.id,
      name: entry.label,
      type: 'line' as const,
      yAxisIndex: unitIndex,
      // A single point has no line segment and needs a persistent marker.
      showSymbol: entry.t.length === 1,
      symbolSize: 5,
      sampling: 'lttb' as const,
      lineStyle: { width: 1.6, color: entry.color },
      itemStyle: { color: entry.color },
      emphasis: { focus: 'series' as const },
      data: entry.t.map((timestamp, index) => [timestamp, entry.v[index]]),
      markLine: band ? thresholdLines(band, tokens) : undefined,
      // Overlapping markArea bands obscure multi-series data; line segments still show severity.
      markArea:
        band && series.length === 1 ? severityZones(band, axes[unitIndex], tokens) : undefined,
    };
  });
  const wideGrid = {
    left: AXIS_GUTTER + leftCount * AXIS_WIDTH,
    right: AXIS_GUTTER + rightCount * AXIS_WIDTH,
  };
  const dataZoom: DataZoomComponentOption[] = [
    {
      type: 'inside',
      xAxisIndex: 0,
      filterMode: 'none',
      // ECharts consumes handled wheel events, so plain wheel input remains page scrolling.
      zoomOnMouseWheel: 'ctrl',
      moveOnMouseWheel: false,
      // Plot dragging belongs to the custom brush; panning remains on the slider.
      moveOnMouseMove: false,
    },
    {
      type: 'slider',
      xAxisIndex: 0,
      filterMode: 'none',
      height: 18,
      bottom: 12,
      backgroundColor: 'transparent',
      borderColor: tokens.hairline,
      fillerColor: withAlpha(tokens.accent, ACCENT_WINDOW_ALPHA),
      dataBackground: {
        lineStyle: { color: tokens.hairlineStrong, width: 1 },
        areaStyle: { color: tokens.hairline },
      },
      selectedDataBackground: {
        lineStyle: { color: tokens.accent, width: 1 },
        areaStyle: { color: withAlpha(tokens.accent, ACCENT_WINDOW_ALPHA) },
      },
      handleStyle: { color: tokens.surface, borderColor: tokens.hairlineStrong },
      moveHandleSize: 0,
      textStyle: { color: tokens.muted, fontFamily: FONT_MONO, fontSize: 10 },
    },
  ];

  return {
    animation: false,
    backgroundColor: 'transparent',
    textStyle: { color: tokens.text, fontFamily: FONT_SANS },
    grid: {
      top: GRID_TOP,
      bottom: GRID_BOTTOM,
      ...wideGrid,
    },
    legend: {
      top: 4,
      right: 8,
      icon: 'circle',
      itemWidth: 8,
      itemHeight: 8,
      itemGap: 16,
      inactiveColor: tokens.hairlineStrong,
      textStyle: {
        color: tokens.muted,
        fontFamily: FONT_SANS,
        fontSize: 12,
        rich: {
          value: {
            color: tokens.text,
            fontFamily: FONT_MONO,
            fontSize: 12,
            padding: [0, 0, 0, 6],
          },
        },
      },
      formatter: (name: string) => {
        const value = lastValues.get(name);
        return value ? `${name}{value|${value}}` : name;
      },
      data: series.map((entry) => entry.label),
    },
    tooltip: {
      trigger: 'axis',
      backgroundColor: tokens.surface,
      borderColor: tokens.hairline,
      borderWidth: 1,
      padding: [8, 10],
      extraCssText: 'box-shadow: none; border-radius: 8px;',
      textStyle: { color: tokens.text, fontFamily: FONT_SANS, fontSize: 12 },
      axisPointer: {
        type: 'cross',
        lineStyle: { color: tokens.hairlineStrong, width: 1 },
        crossStyle: { color: tokens.hairlineStrong, width: 1 },
        label: {
          backgroundColor: tokens.surface,
          borderColor: tokens.hairline,
          borderWidth: 1,
          color: tokens.text,
          fontFamily: FONT_MONO,
          fontSize: 10,
          padding: [3, 6],
        },
      },
      formatter: tooltipFormatter(
        new Map(series.map((entry) => [entry.label, entry.unit])),
        thresholds,
        locale,
        tokens,
      ),
    },
    visualMap: severityMaps,
    xAxis: {
      type: 'time',
      axisLabel: { color: tokens.muted, fontFamily: FONT_MONO, fontSize: 11, hideOverlap: true },
      axisLine: { lineStyle: { color: tokens.hairline } },
      axisTick: { lineStyle: { color: tokens.hairline } },
      splitLine: { show: false },
    },
    yAxis: chartAxes,
    dataZoom,
    media: [
      {
        query: { maxWidth: COMPACT_MAX_WIDTH },
        option: {
          grid: { left: compactLeft, right: compactRight },
          legend: { type: 'scroll', left: 8, right: 8 },
          // replaceMerge also applies inside media options, so every replaced collection is complete.
          yAxis: chartAxes.map((axis, index) =>
            index < 2
              ? {
                  ...axis,
                  show: true,
                  offset: 0,
                  nameGap: 4,
                  axisLabel: { ...axis.axisLabel, fontSize: 10 },
                }
              : { ...axis, show: false, offset: 0 },
          ),
          series: chartSeries,
          dataZoom,
        },
      },
      {
        // ECharts retains the previous media overlay unless the default branch restores it.
        option: {
          grid: wideGrid,
          legend: { type: 'plain', left: 'auto', right: 8 },
          yAxis: chartAxes.map((axis) => ({ ...axis, show: true })),
          series: chartSeries,
          dataZoom,
        },
      },
    ],
    series: chartSeries,
  };
}
