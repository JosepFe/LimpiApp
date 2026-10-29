import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { SessionStore } from './session.store';
import { ThemeService } from './theme';

describe('ThemeService', () => {
  const me = signal<{ theme: string } | null>(null);
  let listeners: ((e: { matches: boolean }) => void)[] = [];
  let prefersDark = false;

  beforeEach(() => {
    listeners = [];
    prefersDark = false;
    vi.stubGlobal('matchMedia', () => ({ matches: prefersDark, addEventListener: (_: string, l: (e: { matches: boolean }) => void) => listeners.push(l) }));
    TestBed.configureTestingModule({ providers: [{ provide: SessionStore, useValue: { me } }] });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    document.documentElement.removeAttribute('data-theme');
  });

  it('dark and light are the user choice; «Sistema» follows the device and its changes', () => {
    me.set({ theme: 'dark' });
    TestBed.inject(ThemeService);
    TestBed.tick();
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');

    me.set({ theme: 'light' });
    TestBed.tick();
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);

    me.set({ theme: 'system' });
    listeners.forEach((l) => l({ matches: true }));
    TestBed.tick();
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('signed out follows the device', () => {
    prefersDark = true;
    me.set(null);
    TestBed.inject(ThemeService);
    TestBed.tick();
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });
});
