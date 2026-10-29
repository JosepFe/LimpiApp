import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { HouseholdApi } from '../../core/household-api';
import { RoomForm } from './room-form';

describe('RoomForm', () => {
  const api = { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() };

  beforeEach(() => Object.values(api).forEach((f) => f.mockReset()));

  async function render(roomId: string | null = null) {
    TestBed.configureTestingModule({
      imports: [RoomForm],
      providers: [provideHttpClient(), provideHttpClientTesting(), { provide: HouseholdApi, useValue: api }],
    });
    const fixture = TestBed.createComponent(RoomForm);
    fixture.componentRef.setInput('roomId', roomId);
    const changed = vi.fn();
    fixture.componentInstance.changed.subscribe(changed);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const q = (id: string) => el.querySelector<HTMLElement>(`[data-testid="${id}"]`)!;
    return { fixture, el, q, changed };
  }

  it('a new room needs a name; the template follows the icon and is only applied when ticked', async () => {
    api.post.mockResolvedValue({ id: 'r-new' });
    const { fixture, el, q, changed } = await render();
    TestBed.inject(HttpTestingController).expectOne('/api/templates').flush([{ id: 'kitchen', name: 'Cocina', emoji: '🍳', taskCount: 6 }]);
    await fixture.whenStable();
    fixture.detectChanges();
    expect(q('room-from-template').textContent).toContain('Cocina: 6 tareas');

    q('room-save').click();
    fixture.detectChanges();
    expect(el.textContent).toContain('El nombre es obligatorio.');
    expect(api.post).not.toHaveBeenCalled();

    // jsdom's selector engine misses emoji in attribute selectors: look the button up by its label instead
    [...el.querySelectorAll<HTMLButtonElement>('[data-testid="room-emoji"] button')].find((b) => b.getAttribute('aria-label') === 'Icono 🚗')!.click();
    fixture.detectChanges();
    expect(el.querySelector('[data-testid="room-from-template"]')).toBeNull();

    const name = q('room-name') as HTMLInputElement;
    name.value = 'Garaje';
    name.dispatchEvent(new Event('input'));
    q('room-save').click();
    await fixture.whenStable();
    expect(api.post).toHaveBeenCalledTimes(1);
    expect(changed).toHaveBeenCalledWith({ archived: false });
  });

  it('edit loads the room, drops empty zones and saves with PATCH; archive deletes', async () => {
    api.get.mockResolvedValue({ id: 'r', name: 'Cocina', emoji: '🍳', color: 'orange', zones: [{ id: 'z', name: 'Nevera' }] });
    api.patch.mockResolvedValue({ id: 'r' });
    const { fixture, el, q, changed } = await render('r');
    await fixture.whenStable();
    fixture.detectChanges();
    q('room-add-zone').click();
    fixture.detectChanges();
    expect(el.querySelectorAll('[aria-label="Zona"]')).toHaveLength(2);
    q('room-save').click();
    await fixture.whenStable();
    expect(api.patch).toHaveBeenCalledWith('/rooms/r', { name: 'Cocina', emoji: '🍳', color: 'orange', zones: [{ id: 'z', name: 'Nevera' }] });

    q('room-archive').click();
    await fixture.whenStable();
    expect(api.delete).toHaveBeenCalledWith('/rooms/r');
    expect(changed).toHaveBeenLastCalledWith({ archived: true });
  });
});
