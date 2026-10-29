import { HttpErrorResponse } from '@angular/common/http';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { BROWSER_CONFIRM } from '../../core/browser';
import { HouseholdApi } from '../../core/household-api';
import { SessionStore } from '../../core/session.store';
import { ToastService } from '../../core/toast';
import { Members } from './members';

const MEMBERS = [
  { id: 'u-josep', name: 'Josep', avatarColor: 'teal', role: 'owner', joinedOn: '2026-03-02' },
  { id: 'u-marta', name: 'Marta', avatarColor: 'amber', role: 'member', joinedOn: '2026-04-18' },
];

describe('Members', () => {
  const api = { get: vi.fn(), delete: vi.fn() };
  const toast = { show: vi.fn() };
  const confirm = vi.fn();
  const households = [{ id: 'h-casa', name: 'Casa Pau y Josep', role: 'owner', memberCount: 2 }];
  const session = {
    me: signal<{ id: string; households: typeof households } | null>({ id: 'u-josep', households }),
    household: signal<(typeof households)[number] | null>(households[0]),
    load: vi.fn(),
    selectHousehold: vi.fn(),
  };

  async function render() {
    TestBed.configureTestingModule({
      imports: [Members],
      providers: [
        provideRouter([]),
        { provide: HouseholdApi, useValue: api },
        { provide: SessionStore, useValue: session },
        { provide: ToastService, useValue: toast },
        { provide: BROWSER_CONFIRM, useValue: confirm },
      ],
    });
    const fixture = TestBed.createComponent(Members);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return { fixture, el: fixture.nativeElement as HTMLElement };
  }

  beforeEach(() => {
    [api.get, api.delete, toast.show, confirm, session.load, session.selectHousehold].forEach((f) => f.mockReset());
    session.me.set({ id: 'u-josep', households });
    api.get.mockResolvedValue(MEMBERS);
  });

  it('shows «tú» on my row, the role badge and «Desde …»', async () => {
    const { el } = await render();
    const rows = el.querySelectorAll('[data-testid="member-row"]');
    expect(rows[0].textContent).toContain('Josep tú');
    expect(rows[1].querySelector('.badge.neutral')?.textContent).toBe('Miembro');
    expect(rows[1].textContent).toContain('Desde 18 abr 2026');
  });

  it('shows the error state when the list fails', async () => {
    api.get.mockRejectedValue(new Error('500'));
    const { el } = await render();
    expect(el.querySelector('[data-testid="members-error"]')).not.toBeNull();
  });

  it('a refused leave shows the API message; another failure a generic one', async () => {
    confirm.mockReturnValue(true);
    api.delete.mockRejectedValueOnce(new HttpErrorResponse({ status: 409, error: { detail: 'Eres el único propietario.' } }));
    const { fixture, el } = await render();
    el.querySelector<HTMLButtonElement>('[data-testid="leave-home"]')!.click();
    await fixture.whenStable();
    expect(toast.show).toHaveBeenLastCalledWith('Eres el único propietario.');

    api.delete.mockRejectedValueOnce(new Error('offline'));
    el.querySelector<HTMLButtonElement>('[data-testid="member-actions"]')!.click();
    await fixture.whenStable();
    expect(toast.show).toHaveBeenLastCalledWith('No hemos podido quitar a Marta.');
    expect(session.load).not.toHaveBeenCalled();
  });

  it('after leaving, goes to the next household or to the onboarding', async () => {
    confirm.mockReturnValue(true);
    api.delete.mockResolvedValue(null);
    session.load.mockImplementation(async () => session.me.set({ id: 'u-josep', households: [] }));
    const { fixture, el } = await render();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    el.querySelector<HTMLButtonElement>('[data-testid="leave-home"]')!.click();
    await fixture.whenStable();
    expect(api.delete).toHaveBeenCalledWith('/members/u-josep');
    expect(navigate).toHaveBeenCalledWith('/onboarding');
    expect(session.selectHousehold).not.toHaveBeenCalled();
  });
});
