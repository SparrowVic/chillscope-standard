import { describe, expect, it } from 'vitest';

interface FileReader {
  readFileSync(path: string, encoding: 'utf8'): string;
}

interface NodeProcess {
  cwd(): string;
  getBuiltinModule(name: 'fs'): FileReader;
}

const nodeProcess = (globalThis as typeof globalThis & { process?: NodeProcess }).process;
if (!nodeProcess) {
  throw new Error('The dashboard layout contract spec requires the Node test runtime.');
}

const reader = nodeProcess.getBuiltinModule('fs');
const root = `${nodeProcess.cwd()}/src/app/features/dashboard`;
const styles = reader.readFileSync(`${root}/dashboard.css`, 'utf8');
const template = reader.readFileSync(`${root}/dashboard.html`, 'utf8');

describe('dashboard layout contract', () => {
  it('keeps exactly one shared-time-axis chart as the primary data region', () => {
    expect(template.match(/<app-chart-panel/g)).toHaveLength(1);
  });

  it('places one complementary cycle heatmap after the primary chart', () => {
    expect(template.match(/<app-cycle-panel/g)).toHaveLength(1);
    expect(template.indexOf('dashboard__chart-area')).toBeLessThan(
      template.indexOf('dashboard__cycle-area'),
    );
  });

  it('lets the chart use the full available width without a competing grid column', () => {
    expect(styles).toContain('.dashboard__chart-area');
    expect(styles).toContain('.dashboard__cycle-area');
    expect(styles).not.toContain('grid-template-areas');
  });
});
