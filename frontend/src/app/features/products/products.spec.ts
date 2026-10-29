import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { HouseholdApi } from '../../core/household-api';
import { Products } from './products';

describe('Products', () => {
  const api = { get: vi.fn(), post: vi.fn(), delete: vi.fn() };

  async function render() {
    TestBed.configureTestingModule({ imports: [Products], providers: [provideRouter([]), { provide: HouseholdApi, useValue: api }] });
    const fixture = TestBed.createComponent(Products);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return { fixture, el: fixture.nativeElement as HTMLElement };
  }

  beforeEach(() => Object.values(api).forEach((f) => f.mockReset()));

  it('lists products with «Usado en N tareas», singular for one', async () => {
    api.get.mockResolvedValue([{ id: 'a', name: 'Lejía', emoji: '🧪', taskCount: 1 }]);
    const { el } = await render();
    expect(el.querySelector('[data-testid="product-row"]')?.textContent).toContain('Usado en 1 tarea');
  });

  it('an empty name adds nothing; a name is added at the end and the field is cleared', async () => {
    api.get.mockResolvedValue([{ id: 'a', name: 'Lejía', emoji: '🧪', taskCount: 1 }]);
    api.post.mockResolvedValue({ id: 'b', name: 'Vinagre', emoji: '🧴', taskCount: 0 });
    const { fixture, el } = await render();
    el.querySelector('form')!.dispatchEvent(new Event('submit'));
    expect(api.post).not.toHaveBeenCalled();

    const input = el.querySelector<HTMLInputElement>('[data-testid="product-new-name"]')!;
    input.value = ' Vinagre ';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    el.querySelector('form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
    fixture.detectChanges();
    expect(api.post).toHaveBeenCalledWith('/products', { name: 'Vinagre' });
    expect(el.querySelectorAll('[data-testid="product-row"]')).toHaveLength(2);
    expect(input.value).toBe('');
  });
});
