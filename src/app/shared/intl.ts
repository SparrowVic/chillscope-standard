const numberFormats = new Map<string, Intl.NumberFormat>();

export function decimalFormat(lang: string, fractionDigits: number): Intl.NumberFormat {
  const key = `${lang}:${fractionDigits}`;
  const existing = numberFormats.get(key);
  if (existing !== undefined) {
    return existing;
  }

  const formatter = new Intl.NumberFormat(lang, {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
  numberFormats.set(key, formatter);
  return formatter;
}
