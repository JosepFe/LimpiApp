import { TestBed } from '@angular/core/testing';
import { HealthRing } from './health-ring';

describe('HealthRing', () => {
  it('shows the value with its level and size, or «–» without health', () => {
    const fixture = TestBed.createComponent(HealthRing);
    fixture.componentRef.setInput('health', { value: 62, label: 'Atención', level: 'warn' });
    fixture.componentRef.setInput('size', 'lg');
    fixture.detectChanges();
    const ring = (fixture.nativeElement as HTMLElement).querySelector('.ring')!;
    expect(ring.className).toBe('ring h-warn lg');
    expect(ring.getAttribute('aria-label')).toBe('Salud 62%');
    expect(ring.textContent).toBe('62');

    fixture.componentRef.setInput('health', null);
    fixture.componentRef.setInput('size', '');
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('.ring')!.textContent).toBe('–');
  });
});
