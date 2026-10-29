import { fitWithin } from './resize-image';

describe('fitWithin (E04/US-006 · criterion 4)', () => {
  it('scales a photo above 1600 px down to 1600 on its longest side, keeping the ratio', () => {
    expect(fitWithin(4032, 3024)).toEqual({ width: 1600, height: 1200 });
    expect(fitWithin(3024, 4032)).toEqual({ width: 1200, height: 1600 });
  });

  it('never enlarges a small photo', () => {
    expect(fitWithin(800, 600)).toEqual({ width: 800, height: 600 });
  });
});
