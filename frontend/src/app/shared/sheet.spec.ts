import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Sheet } from './sheet';

@Component({
  imports: [Sheet],
  template: `<la-sheet screen="demo" title="Demo" [full]="true" (closed)="closes = closes + 1"><p>Cuerpo</p></la-sheet>`,
})
class Host {
  closes = 0;
}

describe('Sheet', () => {
  it('renders the prototype overlay and closes with the button, the scrim and Escape', () => {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const overlay = el.querySelector('.overlay.open')!;
    expect(overlay.getAttribute('data-screen')).toBe('screen-demo');
    expect(overlay.getAttribute('aria-label')).toBe('Demo');
    expect(el.querySelector('[data-testid="sheet-demo"]')?.classList).toContain('full');
    expect(el.querySelector('.sheet-body')?.textContent).toBe('Cuerpo');

    el.querySelector<HTMLButtonElement>('[data-testid="sheet-close"]')!.click();
    el.querySelector<HTMLElement>('.scrim')!.click();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(fixture.componentInstance.closes).toBe(3);
  });
});
