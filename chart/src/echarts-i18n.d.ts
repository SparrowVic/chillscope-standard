/** ECharts does not declare its ESM locale tables. */
declare module 'echarts/lib/i18n/langPL.js' {
  // A top-level import would turn this declaration into an invalid augmentation.
  // eslint-disable-next-line @typescript-eslint/consistent-type-imports
  const locale: Parameters<typeof import('echarts/core').registerLocale>[1];
  export default locale;
}
