import { versionLine } from './build-info';

describe('versionLine', () => {
  it('without a build id, uses the day it runs', () => {
    expect(versionLine(new Date('2026-10-14T07:00:00Z'))).toBe('LimpiApp 0.1.0 · build 2026.10.14');
  });
});
