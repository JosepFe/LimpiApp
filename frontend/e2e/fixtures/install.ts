// A fake `beforeinstallprompt` (Chrome fires it only for real installable sites): records prompt() and answers `outcome`.
import type { Page } from '@playwright/test';

export async function offerInstall(page: Page, outcome: 'accepted' | 'dismissed' = 'accepted'): Promise<void> {
  await page.evaluate((answer) => {
    const event = new Event('beforeinstallprompt', { cancelable: true }) as Event & { prompt(): Promise<void>; userChoice: Promise<unknown> };
    (window as unknown as { prompted: number }).prompted = 0;
    event.prompt = async () => void ((window as unknown as { prompted: number }).prompted += 1);
    event.userChoice = Promise.resolve({ outcome: answer });
    window.dispatchEvent(event);
  }, outcome);
}
