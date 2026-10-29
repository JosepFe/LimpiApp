import { TestBed } from '@angular/core/testing';
import { InstallService } from './install';

function offer(outcome: 'accepted' | 'dismissed') {
  const event = Object.assign(new Event('beforeinstallprompt', { cancelable: true }), {
    prompt: vi.fn().mockResolvedValue(undefined),
    userChoice: Promise.resolve({ outcome }),
  });
  window.dispatchEvent(event);
  return event;
}

describe('InstallService', () => {
  it('keeps the event (no browser infobar), prompts once and forgets it', async () => {
    const install = TestBed.inject(InstallService);
    expect(install.available()).toBe(false);
    await install.install(); // nothing to prompt

    const event = offer('accepted');
    expect(event.defaultPrevented).toBe(true);
    expect(install.available()).toBe(true);
    await install.install();
    expect(event.prompt).toHaveBeenCalledTimes(1);
    expect(install.available()).toBe(false);
  });
});
