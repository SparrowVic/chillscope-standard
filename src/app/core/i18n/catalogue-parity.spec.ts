import { describe, expect, it } from 'vitest';

import en from '../../../assets/i18n/en.json';
import pl from '../../../assets/i18n/pl.json';

function leafKeys(value: unknown, prefix = ''): string[] {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return [prefix];
  }

  return Object.entries(value).flatMap(([key, nested]) =>
    leafKeys(nested, prefix.length > 0 ? `${prefix}.${key}` : key),
  );
}

describe('translation catalogues', () => {
  it('keeps the English and Polish key sets identical', () => {
    expect(leafKeys(en).sort()).toEqual(leafKeys(pl).sort());
  });
});
