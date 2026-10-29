import { HttpErrorResponse } from '@angular/common/http';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { BROWSER_SHARE } from '../../core/browser';
import { HouseholdApi } from '../../core/household-api';
import { SessionStore } from '../../core/session.store';
import { ToastService } from '../../core/toast';
import { Invite } from './invite';

const INVITE = { id: 'i1', code: 'abc', url: 'http://127.0.0.1:8090/join/abc', expiresAt: '', uses: 0, maxUses: 5, expired: false };

describe('Invite', () => {
  const api = { get: vi.fn(), post: vi.fn(), delete: vi.fn() };
  const toast = { show: vi.fn() };
  const browser = { copy: vi.fn(), share: null as ((data: ShareData) => Promise<void>) | null };
  const session = { household: signal({ id: 'h', name: 'Casa' }) };

  async function render() {
    TestBed.configureTestingModule({
      imports: [Invite],
      providers: [
        { provide: HouseholdApi, useValue: api },
        { provide: ToastService, useValue: toast },
        { provide: BROWSER_SHARE, useValue: browser },
        { provide: SessionStore, useValue: session },
      ],
    });
    const fixture = TestBed.createComponent(Invite);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return { fixture, el: fixture.nativeElement as HTMLElement };
  }

  beforeEach(() => {
    [api.get, api.post, api.delete, toast.show, browser.copy].forEach((f) => f.mockReset());
    browser.share = null;
  });

  it('shows the link without the scheme, the days left in singular and the uses', async () => {
    api.get.mockResolvedValue({ ...INVITE, expiresAt: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString() });
    const { el } = await render();
    expect(el.querySelector('[data-testid="invite-link"]')?.textContent).toBe('127.0.0.1:8090/join/abc');
    expect(el.textContent).toContain('Caduca en 1 día');
    expect(el.textContent).toContain('0 de 5');
  });

  it('a failing current link (not 404) is the error state, without creating one', async () => {
    api.get.mockRejectedValue(new HttpErrorResponse({ status: 500 }));
    const { el } = await render();
    expect(el.textContent).toContain('No hemos podido crear el enlace.');
    expect(api.post).not.toHaveBeenCalled();
  });

  it('copy and revoke failures only show a toast; a closed share sheet is not an error', async () => {
    api.get.mockResolvedValue({ ...INVITE, expiresAt: new Date(Date.now() + 7 * 864e5).toISOString() });
    browser.copy.mockRejectedValue(new Error('denied'));
    api.delete.mockRejectedValue(new Error('500'));
    browser.share = vi.fn().mockRejectedValue(new DOMException('AbortError'));
    const { fixture, el } = await render();
    let closed = 0;
    fixture.componentInstance.closed.subscribe(() => closed++);

    el.querySelector<HTMLButtonElement>('[data-testid="invite-copy"]')!.click();
    await fixture.whenStable();
    expect(toast.show).toHaveBeenLastCalledWith('No hemos podido copiar el enlace.');
    el.querySelector<HTMLButtonElement>('[data-testid="invite-share"]')!.click();
    await fixture.whenStable();
    expect(browser.share).toHaveBeenCalled();
    el.querySelector<HTMLButtonElement>('[data-testid="invite-revoke"]')!.click();
    await fixture.whenStable();
    expect(toast.show).toHaveBeenLastCalledWith('No hemos podido revocar el enlace.');
    expect(closed).toBe(0);
  });
});
