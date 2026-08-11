import { computed, type Signal } from '@angular/core';
import type { SeriesId } from '../../core/data/measurement.models';
import { injectTranslator } from '../../core/i18n/translator';
import { SERIES_LABEL_KEYS, SERIES_UNIT_KEYS } from '../../shared/series-display';

function injectSeriesText(
  keys: Readonly<Record<SeriesId, string>>,
): Signal<Readonly<Record<SeriesId, string>>> {
  const translator = injectTranslator();

  return computed(() => {
    const translate = translator();
    // Explicit keys keep the record exhaustive when a series id changes.
    return {
      temperature: translate(keys.temperature),
      pressure: translate(keys.pressure),
      flow: translate(keys.flow),
      rpm: translate(keys.rpm),
    };
  });
}

export function injectSeriesLabels(): Signal<Readonly<Record<SeriesId, string>>> {
  return injectSeriesText(SERIES_LABEL_KEYS);
}

export function injectSeriesUnits(): Signal<Readonly<Record<SeriesId, string>>> {
  return injectSeriesText(SERIES_UNIT_KEYS);
}
