<script setup lang="ts">
import { init, type ECharts } from 'echarts/core';
import { computed, onBeforeUnmount, onMounted, ref, useHost, watch } from 'vue';
import { buildChartOption, GRID_BOTTOM, GRID_TOP, themeTokens } from '../chart-option';
import '../echarts-setup';
import type {
  ChartLabels,
  ChartSeries,
  ChartTheme,
  ChartThresholds,
  RangeSelectedDetail,
} from '../types';

const props = withDefaults(
  defineProps<{
    series?: readonly ChartSeries[];
    thresholds?: ChartThresholds;
    labels?: ChartLabels;
    theme?: ChartTheme;
    locale?: string;
    loading?: boolean;
    resetKey?: number;
  }>(),
  { series: () => [], theme: 'light', locale: 'en', loading: false, resetKey: 0 },
);

/** Debounces the continuous dataZoom events emitted by wheel input. */
const ZOOM_SETTLE_MS = 260;
const REPLACED_COMPONENTS = ['series', 'yAxis'] as const;
/** Ignores small pointer movement that should remain a click. */
const BRUSH_MIN_PX = 8;

const host = useHost();
const canvas = ref<HTMLElement | null>(null);

let chart: ECharts | null = null;
let observer: ResizeObserver | null = null;
let renderFrame: number | undefined;
let mounted = false;
let settleTimer: ReturnType<typeof setTimeout> | undefined;
let programmatic = false;
let dragging = false;
let settlePending = false;
let lastEmitted: RangeSelectedDetail | null = null;
let rangeResponsePending = false;
let resetZoomOnRender = false;

const isEmpty = computed(() => props.series.every((entry) => entry.t.length === 0));

const overlayMessage = computed(() => {
  if (props.loading) {
    return props.labels?.loading ?? 'Loading…';
  }
  return isEmpty.value ? (props.labels?.empty ?? 'No data') : '';
});

/** Supplies the text that is not exposed by the canvas. */
const ariaLabel = computed(() => {
  const description = props.labels?.ariaLabel ?? 'Measurements over time';
  const names = props.series.map((entry) => entry.label).filter(Boolean);
  return names.length > 0 ? `${description}: ${names.join(', ')}` : description;
});

const extent = computed(() => {
  let from = Number.POSITIVE_INFINITY;
  let to = Number.NEGATIVE_INFINITY;
  for (const entry of props.series) {
    if (entry.t.length === 0) {
      continue;
    }
    from = Math.min(from, entry.t[0]);
    to = Math.max(to, entry.t[entry.t.length - 1]);
  }
  return Number.isFinite(from) && Number.isFinite(to) && to > from ? { from, to } : null;
});

/** ECharts resolves the locale at construction time, so a language switch needs a fresh instance. */
function echartsLocale(locale: string): string {
  return locale.toLowerCase().startsWith('pl') ? 'PL' : 'EN';
}

function createChart(): void {
  if (!canvas.value) {
    return;
  }
  chart = init(canvas.value, null, { locale: echartsLocale(props.locale) });
  chart.on('datazoom', onZoom);
  scheduleRender();
}

function destroyChart(): void {
  cancelScheduledRender();
  chart?.off('datazoom', onZoom);
  chart?.dispose();
  chart = null;
  lastEmitted = null;
}

function renderNow(): void {
  if (!chart) {
    return;
  }
  const replaceZoom = resetZoomOnRender;
  resetZoomOnRender = false;
  withSuppressedZoomEvents(() => {
    chart?.setOption(
      buildChartOption({
        series: props.series,
        thresholds: props.thresholds,
        tokens: themeTokens(props.theme),
        locale: props.locale,
      }),
      // Keep local zoom for live updates, but reset it after a backend range change so old
      // percentages are not applied to the new range.
      {
        replaceMerge: replaceZoom ? [...REPLACED_COMPONENTS, 'dataZoom'] : [...REPLACED_COMPONENTS],
      },
    );
    lastEmitted = null;
  });
}

/** The normal zoom pipeline ignores a reset that covers the full loaded range. */
function resetZoom(): void {
  chart?.dispatchAction({ type: 'dataZoom', start: 0, end: 100 });
}

function requestRestore(): void {
  resetZoom();
  host?.dispatchEvent(new CustomEvent('restoreRequested'));
}

/* The custom brush uses public coordinate conversion and dataZoom APIs. */

const brush = ref<{ readonly from: number; readonly to: number } | null>(null);
let brushPointer: number | null = null;

/** Returns the plot width in host pixels so the brush stays off the axes. */
function plotBand(): { left: number; right: number } | null {
  const bounds = extent.value;
  if (!chart || !bounds) {
    return null;
  }
  const left = chart.convertToPixel({ xAxisIndex: 0 }, bounds.from);
  const right = chart.convertToPixel({ xAxisIndex: 0 }, bounds.to);
  return Number.isFinite(left) && Number.isFinite(right) && right > left ? { left, right } : null;
}

function brushX(event: PointerEvent): number {
  const rect = canvas.value?.getBoundingClientRect();
  return rect ? event.clientX - rect.left : 0;
}

function onBrushDown(event: PointerEvent): void {
  // Touch keeps native scrolling and pinch gestures; the custom brush is for mouse and pen.
  if (event.button !== 0 || event.pointerType === 'touch' || brushPointer !== null) {
    return;
  }
  const rect = canvas.value?.getBoundingClientRect();
  const band = plotBand();
  if (!rect || !band) {
    return;
  }
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  if (y < GRID_TOP || y > rect.height - GRID_BOTTOM || x < band.left || x > band.right) {
    return;
  }
  brushPointer = event.pointerId;
  brush.value = { from: x, to: x };
  // jsdom (and some embedders) ship no pointer capture; tracking works without it.
  canvas.value?.setPointerCapture?.(event.pointerId);
}

function onBrushMove(event: PointerEvent): void {
  if (brushPointer !== event.pointerId || !brush.value) {
    return;
  }
  const band = plotBand();
  if (!band) {
    return;
  }
  brush.value = {
    from: brush.value.from,
    to: Math.min(band.right, Math.max(band.left, brushX(event))),
  };
}

function onBrushUp(event: PointerEvent): void {
  if (brushPointer !== event.pointerId) {
    return;
  }
  const selection = brush.value;
  cancelBrush();
  if (!chart || !selection || Math.abs(selection.to - selection.from) < BRUSH_MIN_PX) {
    return;
  }
  const [fromPx, toPx] = [selection.from, selection.to].sort((a, b) => a - b);
  const startValue = chart.convertFromPixel({ xAxisIndex: 0 }, fromPx);
  const endValue = chart.convertFromPixel({ xAxisIndex: 0 }, toPx);
  if (!Number.isFinite(startValue) || !Number.isFinite(endValue) || endValue <= startValue) {
    return;
  }
  chart.dispatchAction({ type: 'dataZoom', startValue, endValue });
}

function cancelBrush(): void {
  brushPointer = null;
  brush.value = null;
}

function onBrushKey(event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    cancelBrush();
  }
}

const brushBox = computed(() => {
  const selection = brush.value;
  if (!selection) {
    return null;
  }
  const left = Math.min(selection.from, selection.to);
  return { left: `${left}px`, width: `${Math.abs(selection.to - selection.from)}px` };
});

const gridInset = { top: `${GRID_TOP}px`, bottom: `${GRID_BOTTOM}px` };

function scheduleRender(): void {
  if (!mounted || renderFrame !== undefined) {
    return;
  }
  renderFrame = requestAnimationFrame(() => {
    renderFrame = undefined;
    renderNow();
  });
}

function cancelScheduledRender(): void {
  if (renderFrame === undefined) {
    return;
  }
  cancelAnimationFrame(renderFrame);
  renderFrame = undefined;
}

/** ECharts dispatches zoom events asynchronously, so this guard crosses one task boundary. */
function withSuppressedZoomEvents(action: () => void): void {
  programmatic = true;
  action();
  setTimeout(() => {
    programmatic = false;
  });
}

interface ZoomState {
  readonly start?: number;
  readonly end?: number;
  readonly startValue?: number;
  readonly endValue?: number;
}

function selectedWindow(): RangeSelectedDetail | null {
  const bounds = extent.value;
  if (!chart || !bounds) {
    return null;
  }
  const [zoom] = (chart.getOption() as { dataZoom?: readonly ZoomState[] }).dataZoom ?? [];
  if (!zoom) {
    return null;
  }
  const span = bounds.to - bounds.from;
  const rawFrom = Number.isFinite(zoom.startValue)
    ? Number(zoom.startValue)
    : bounds.from + (span * (zoom.start ?? 0)) / 100;
  const rawTo = Number.isFinite(zoom.endValue)
    ? Number(zoom.endValue)
    : bounds.from + (span * (zoom.end ?? 100)) / 100;
  // ECharts may round the time-axis extent beyond the first and last sample.
  const from = Math.max(bounds.from, Math.round(rawFrom));
  const to = Math.min(bounds.to, Math.round(rawTo));
  return to > from ? { from, to } : null;
}

function onZoom(): void {
  if (programmatic) {
    return;
  }
  clearTimeout(settleTimer);
  settleTimer = setTimeout(settle, ZOOM_SETTLE_MS);
}

function onDragStart(): void {
  dragging = true;
}

/** Defers slider updates until pointer release. */
function onDragEnd(): void {
  dragging = false;
  if (settlePending) {
    settlePending = false;
    settle();
  }
}

function settle(): void {
  if (dragging) {
    settlePending = true;
    return;
  }
  clearTimeout(settleTimer);
  const bounds = extent.value;
  const selection = selectedWindow();
  if (!bounds || !selection) {
    return;
  }
  const tolerance = Math.max(1, (bounds.to - bounds.from) / 1000);
  const coversEverything =
    selection.from - bounds.from <= tolerance && bounds.to - selection.to <= tolerance;
  const repeated = lastEmitted?.from === selection.from && lastEmitted?.to === selection.to;
  if (coversEverything || repeated) {
    return;
  }
  lastEmitted = selection;
  rangeResponsePending = true;
  host?.dispatchEvent(new CustomEvent<RangeSelectedDetail>('rangeSelected', { detail: selection }));
}

onMounted(() => {
  mounted = true;
  if (!canvas.value) {
    return;
  }
  createChart();
  canvas.value.addEventListener('pointerdown', onDragStart);
  canvas.value.addEventListener('dblclick', requestRestore);
  canvas.value.addEventListener('lostpointercapture', onDragEnd);
  canvas.value.addEventListener('pointerdown', onBrushDown);
  canvas.value.addEventListener('pointermove', onBrushMove);
  canvas.value.addEventListener('pointerup', onBrushUp);
  canvas.value.addEventListener('pointercancel', cancelBrush);
  window.addEventListener('keydown', onBrushKey);
  window.addEventListener('pointerup', onDragEnd);
  window.addEventListener('pointercancel', onDragEnd);
  window.addEventListener('blur', onDragEnd);
  observer = new ResizeObserver(() => chart?.resize());
  observer.observe(canvas.value);
  // ECharts caches text metrics, so repaint after the webfonts load.
  void document.fonts?.ready.then(() => scheduleRender());
});

onBeforeUnmount(() => {
  mounted = false;
  clearTimeout(settleTimer);
  canvas.value?.removeEventListener('pointerdown', onDragStart);
  canvas.value?.removeEventListener('dblclick', requestRestore);
  canvas.value?.removeEventListener('lostpointercapture', onDragEnd);
  canvas.value?.removeEventListener('pointerdown', onBrushDown);
  canvas.value?.removeEventListener('pointermove', onBrushMove);
  canvas.value?.removeEventListener('pointerup', onBrushUp);
  canvas.value?.removeEventListener('pointercancel', cancelBrush);
  window.removeEventListener('keydown', onBrushKey);
  window.removeEventListener('pointerup', onDragEnd);
  window.removeEventListener('pointercancel', onDragEnd);
  window.removeEventListener('blur', onDragEnd);
  observer?.disconnect();
  observer = null;
  destroyChart();
});

watch(
  () => props.series,
  () => {
    if (rangeResponsePending) {
      rangeResponsePending = false;
      resetZoomOnRender = true;
    }
    scheduleRender();
  },
);

watch(() => props.thresholds, scheduleRender);
watch(() => props.resetKey, resetZoom);

watch(
  () => props.locale,
  () => {
    destroyChart();
    createChart();
  },
);

watch(() => props.theme, scheduleRender);
</script>

<template>
  <div class="chart">
    <div ref="canvas" class="chart__canvas" role="img" :aria-label="ariaLabel"></div>

    <div
      v-if="brushBox"
      class="chart__brush"
      :style="{ ...brushBox, top: gridInset.top, bottom: gridInset.bottom }"
      aria-hidden="true"
    ></div>

    <p v-if="overlayMessage" class="chart__overlay" role="status">{{ overlayMessage }}</p>
  </div>
</template>

<style src="./MeasurementChart.host.css"></style>
<style scoped src="./MeasurementChart.css"></style>
