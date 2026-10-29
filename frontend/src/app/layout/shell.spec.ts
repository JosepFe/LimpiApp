import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, withComponentInputBinding } from '@angular/router';
import { SessionStore } from '../core/session.store';
import { Placeholder } from '../features/placeholder/placeholder';
import { Shell } from './shell';

class FakeSession {
  me = signal(null);
  pendingToday = signal(6);
  household = signal({ id: 'h-casa', name: 'Casa Pau y Josep', role: 'owner', memberCount: 3 });
}

describe('Shell', () => {
  async function render(url: string) {
    TestBed.configureTestingModule({
      imports: [Shell],
      providers: [
        provideRouter([
          { path: 'history', component: Placeholder, data: { screen: 'history', title: 'Actividad' } },
          { path: 'stats', component: Placeholder, data: { screen: 'stats', title: 'Actividad' } },
          { path: 'today', component: Placeholder, data: { screen: 'today', title: 'Hoy' } },
        ], withComponentInputBinding()),
        { provide: SessionStore, useValue: new FakeSession() },
      ],
    });
    await TestBed.inject(Router).navigateByUrl(url);
    const fixture = TestBed.createComponent(Shell);
    fixture.detectChanges();
    await fixture.whenStable();
    return { el: fixture.nativeElement as HTMLElement };
  }

  it('shows the household and the «Hoy» counter', async () => {
    const { el } = await render('/today');
    expect(el.querySelector('[data-testid="side-home-switcher"]')?.textContent).toContain('Casa Pau y Josep');
    expect(el.querySelector('[data-testid="nav-today"]')?.textContent).toContain('6');
  });

  it('highlights Actividad on both of its tabs, in the sidebar and the bottom bar', async () => {
    const { el } = await render('/stats?x=1');
    expect(el.querySelector('[data-testid="nav-activity"]')?.classList).toContain('active');
    expect(el.querySelector('[data-testid="bnav-activity"]')?.classList).toContain('active');
    expect(el.querySelector('[data-testid="nav-today"]')?.classList).not.toContain('active');
  });
});
