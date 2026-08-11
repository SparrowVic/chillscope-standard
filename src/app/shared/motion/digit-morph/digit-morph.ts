import {
  ChangeDetectionStrategy,
  Component,
  DOCUMENT,
  inject,
  input,
  linkedSignal,
} from '@angular/core';

const STAGGER_MS = 45;

interface MorphCell {
  readonly key: string;
  readonly char: string;
  readonly outChar: string | null;
  readonly delay: string | null;
}

function glyph(char: string): string {
  // Keep spaces from collapsing inside inline spans.
  return char === ' ' ? '\u00a0' : char;
}

@Component({
  selector: 'cs-digit-morph',
  templateUrl: './digit-morph.html',
  styleUrl: './digit-morph.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CsDigitMorph {
  readonly value = input.required<string>();

  readonly #reducedMotion =
    inject(DOCUMENT).defaultView?.matchMedia?.('(prefers-reduced-motion: reduce)') ?? null;

  protected readonly cells = linkedSignal<string, MorphCell[]>({
    source: this.value,
    computation: (next, previous) => {
      const before = previous === undefined ? [] : [...previous.source];
      const animate = before.length > 0 && !(this.#reducedMotion?.matches ?? false);
      return [...next].map((raw, index) => {
        const char = glyph(raw);
        const old = before[index];
        if (animate && old !== undefined && old !== raw) {
          return {
            key: `${index}:${old}>${raw}`,
            char,
            outChar: glyph(old),
            delay: `${index * STAGGER_MS}ms`,
          };
        }
        return { key: `${index}:${raw}`, char, outChar: null, delay: null };
      });
    },
  });
}
