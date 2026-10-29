import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { UiKit } from './ui-kit';

describe('UiKit', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter([{ path: 'ui-kit', component: UiKit }])] });
  });

  it('switches to the dark theme with ?theme=dark and back when leaving', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/ui-kit?theme=dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');

    await harness.navigateByUrl('/ui-kit');
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);

    await harness.navigateByUrl('/ui-kit?theme=dark');
    TestBed.inject(Router).resetConfig([]);
    harness.fixture.destroy();
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
  });

  it('is the screen-ui-kit of the prototype', async () => {
    const harness = await RouterTestingHarness.create('/ui-kit');
    expect(harness.routeNativeElement?.querySelector('[data-screen="screen-ui-kit"]')).not.toBeNull();
  });
});
