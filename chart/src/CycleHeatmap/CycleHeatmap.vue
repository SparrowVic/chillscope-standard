<script setup lang="ts">
import { init, type ECharts } from 'echarts/core';
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { themeTokens } from '../chart-option';
import { buildHeatmapOption } from '../heatmap-option';
import '../echarts-setup';
import type { ChartTheme, HeatmapLabels, HeatmapMatrix } from '../types';

const props = withDefaults(
  defineProps<{
    matrix?: HeatmapMatrix;
    labels?: HeatmapLabels;
    theme?: ChartTheme;
    locale?: string;
    loading?: boolean;
  }>(),
  { theme: 'light', locale: 'en', loading: false },
);

const canvas = ref<HTMLElement | null>(null);

let chart: ECharts | null = null;
let observer: ResizeObserver | null = null;
let renderFrame: number | undefined;
let mounted = false;

const isEmpty = computed(() => !props.matrix || props.matrix.days.length === 0);

const overlayMessage = computed(() => {
  if (props.loading) {
    return props.labels?.loading ?? 'Loading…';
  }
  return isEmpty.value ? (props.labels?.empty ?? 'No data') : '';
});

/** Supplies the text that is not exposed by the canvas. */
const ariaLabel = computed(() => {
  const description = props.labels?.ariaLabel ?? 'Daily cycle';
  const name = props.matrix?.label;
  return name ? `${description}: ${name}` : description;
});

function renderNow(): void {
  if (!chart || !props.matrix) {
    return;
  }
  chart.setOption(
    buildHeatmapOption({
      matrix: props.matrix,
      tokens: themeTokens(props.theme),
      locale: props.locale,
    }),
    // Replacing the option prevents rows from a longer previous matrix from remaining visible.
    { notMerge: true },
  );
}

function scheduleRender(): void {
  if (!mounted || renderFrame !== undefined) {
    return;
  }
  renderFrame = requestAnimationFrame(() => {
    renderFrame = undefined;
    renderNow();
  });
}

onMounted(() => {
  mounted = true;
  if (!canvas.value) {
    return;
  }
  chart = init(canvas.value);
  scheduleRender();
  observer = new ResizeObserver(() => chart?.resize());
  observer.observe(canvas.value);
  // ECharts caches text metrics, so repaint after the webfonts load.
  void document.fonts?.ready.then(() => scheduleRender());
});

onBeforeUnmount(() => {
  mounted = false;
  if (renderFrame !== undefined) {
    cancelAnimationFrame(renderFrame);
    renderFrame = undefined;
  }
  observer?.disconnect();
  observer = null;
  chart?.dispose();
  chart = null;
});

watch(() => props.matrix, scheduleRender);
watch(() => props.theme, scheduleRender);
watch(() => props.locale, scheduleRender);
</script>

<template>
  <div class="heatmap">
    <div ref="canvas" class="heatmap__canvas" role="img" :aria-label="ariaLabel"></div>

    <p v-if="overlayMessage" class="heatmap__overlay" role="status">{{ overlayMessage }}</p>
  </div>
</template>

<style src="./CycleHeatmap.host.css"></style>
<style scoped src="./CycleHeatmap.css"></style>
