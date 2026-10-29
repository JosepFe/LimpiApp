import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { HouseholdApi } from '../../core/household-api';
import { RoomDetail } from './room-detail';

const ROOM = { id: 'r', name: 'Cocina', emoji: '🍳', color: 'orange', zones: [{ id: 'zn', name: 'Nevera' }, { id: 'zh', name: 'Horno' }], health: { value: 62, label: 'Atención', level: 'warn' }, overdueCount: 1, activeTaskCount: 1, next: null };
const task = (id: string, zone: { id: string; name: string } | null) => ({
  id, title: id, roomId: 'r', roomName: 'Cocina', roomEmoji: '🍳', zone, estimatedMinutes: 10, nextDue: '2026-10-14', due: { kind: 'today', label: 'Hoy' }, assignee: null,
});

describe('RoomDetail', () => {
  it('groups by zone in the room order, leaves out empty zones and ends with «Sin zona»; singular counts', async () => {
    const api = { get: vi.fn((url: string) => Promise.resolve(url.startsWith('/rooms') ? ROOM : [task('a', null), task('b', { id: 'zh', name: 'Horno' })])) };
    TestBed.configureTestingModule({ imports: [RoomDetail], providers: [provideRouter([]), { provide: HouseholdApi, useValue: api }] });
    const fixture = TestBed.createComponent(RoomDetail);
    fixture.componentRef.setInput('id', 'r');
    fixture.detectChanges();
    await new Promise((r) => setTimeout(r));
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect([...el.querySelectorAll('.group-h')].map((g) => g.textContent?.replace(/\s+/g, ' ').trim())).toEqual(['Horno 1', 'Sin zona 1']);
    expect(el.querySelector('[data-testid="room-health"]')?.textContent).toContain('1 atrasada · 1 tarea activa');
  });
});
