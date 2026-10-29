import { TestBed } from '@angular/core/testing';
import { Onboarding } from './onboarding';

describe('Onboarding', () => {
  function render() {
    TestBed.configureTestingModule({ imports: [Onboarding] });
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
  });
});
