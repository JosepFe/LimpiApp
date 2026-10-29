import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { SessionStore } from '../../core/session.store';
import { Onboarding } from './onboarding';

const TEMPLATES = [
  { id: 'kitchen', name: 'Cocina', emoji: '🍳', color: 'orange', taskCount: 6 },
  { id: 'hall', name: 'Recibidor', emoji: '🚪', color: 'slate', taskCount: 2 },
];

describe('Onboarding', () => {
  const session = { load: vi.fn(() => Promise.resolve(true)), selectHousehold: vi.fn() };

  function render() {
    TestBed.configureTestingModule({
      imports: [Onboarding],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([]), { provide: SessionStore, useValue: session }],
    });
    const fixture = TestBed.createComponent(Onboarding);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const q = <T extends Element>(id: string) => el.querySelector<T>(`[data-testid="${id}"]`);
    return { fixture, el, q };
  }

  it('step 1 does not go on without a name and marks the field', () => {
    const { fixture, el, q } = render();
    q<HTMLButtonElement>('onboarding-next')!.click();
    fixture.detectChanges();
    expect(el.querySelector('.field.invalid')).not.toBeNull();
    expect(q('onboarding-name')?.getAttribute('aria-invalid')).toBe('true');
    expect(q('onboarding-next')).not.toBeNull();
  });

  it('with a name, «Siguiente» leaves step 1; Europe/Madrid is the default zone', () => {
    const { fixture, q } = render();
    expect(q<HTMLSelectElement>('onboarding-timezone')!.value).toBe('Europe/Madrid');
    const input = q<HTMLInputElement>('onboarding-name')!;
    input.value = 'Casa Pau y Josep';
    input.dispatchEvent(new Event('input'));
    q<HTMLSelectElement>('onboarding-timezone')!.value = 'Atlantic/Canary';
    q<HTMLSelectElement>('onboarding-timezone')!.dispatchEvent(new Event('change'));
    q<HTMLButtonElement>('onboarding-next')!.click();
    fixture.detectChanges();
    expect(q('onboarding-next')).toBeNull();
    // Until the templates arrive, no summary and «Crear hogar» cannot create an empty household.
    expect(q('template-summary')).toBeNull();
    expect(q<HTMLButtonElement>('onboarding-create')!.disabled).toBe(true);
    TestBed.inject(HttpTestingController).expectOne('/api/templates').flush(TEMPLATES);
  });

  async function toTemplates() {
    const r = render();
    const input = r.q<HTMLInputElement>('onboarding-name')!;
    input.value = 'Casa';
    input.dispatchEvent(new Event('input'));
    r.q<HTMLButtonElement>('onboarding-next')!.click();
    TestBed.inject(HttpTestingController).expectOne('/api/templates').flush(TEMPLATES);
    await r.fixture.whenStable();
    r.fixture.detectChanges();
    return r;
  }

  it('the summary counts the selected cards, in singular when there is one', async () => {
    const { fixture, el, q } = await toTemplates();
    expect(q('template-summary')?.textContent).toBe('1 habitación · 6 tareas');
    el.querySelectorAll<HTMLButtonElement>('[data-testid="template-card"]')[1].click();
    fixture.detectChanges();
    expect(q('template-summary')?.textContent).toBe('2 habitaciones · 8 tareas');
    el.querySelectorAll<HTMLButtonElement>('[data-testid="template-card"]')[0].click();
    el.querySelectorAll<HTMLButtonElement>('[data-testid="template-card"]')[1].click();
    fixture.detectChanges();
    expect(q('template-summary')?.textContent).toBe('0 habitaciones · 0 tareas');
  });

  it('creates the household, selects it and opens Hoy; going back keeps the name', async () => {
    const { fixture, q } = await toTemplates();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    q<HTMLButtonElement>('onboarding-create')!.click();
    fixture.detectChanges();
    expect(q('onboarding-creating')).not.toBeNull();

    const req = TestBed.inject(HttpTestingController).expectOne('/api/households');
    expect(req.request.body).toEqual({ name: 'Casa', timeZone: 'Europe/Madrid', templates: ['kitchen'] });
    req.flush({ id: 'h-new' });
    await fixture.whenStable();
    await new Promise((r) => setTimeout(r));

    expect(session.load).toHaveBeenCalled();
    expect(session.selectHousehold).toHaveBeenCalledWith('h-new');
    expect(navigate).toHaveBeenCalledWith('/today');
  });

  it('a failed creation goes back to step 1 with the error', async () => {
    const { fixture, el, q } = await toTemplates();
    q<HTMLButtonElement>('onboarding-create')!.click();
    TestBed.inject(HttpTestingController).expectOne('/api/households').flush(null, { status: 500, statusText: 'x' });
    await fixture.whenStable();
    fixture.detectChanges();
    expect(el.textContent).toContain('No hemos podido crear el hogar. Inténtalo de nuevo.');
    expect(q<HTMLInputElement>('onboarding-name')!.value).toBe('Casa');
  });
});
