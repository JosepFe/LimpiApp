import { RefreshBus } from './refresh-bus';

describe('RefreshBus', () => {
  it('bump increases the version', () => {
    const bus = new RefreshBus();
    bus.bump();
    bus.bump();
    expect(bus.version()).toBe(2);
  });
});
