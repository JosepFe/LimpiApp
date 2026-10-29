import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Login } from './login';

describe('Login', () => {
  let http: HttpTestingController;

  function render(inputs: Record<string, string> = {}) {
    TestBed.configureTestingModule({ imports: [Login], providers: [provideHttpClient(), provideHttpClientTesting()] });
    http = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(Login);
    for (const [k, v] of Object.entries(inputs)) fixture.componentRef.setInput(k, v);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const type = (value: string) => {
      const input = el.querySelector<HTMLInputElement>('[data-testid="login-email"]')!;
      input.value = value;
      input.dispatchEvent(new Event('input'));
    };
    const submit = () => el.querySelector('form')!.dispatchEvent(new Event('submit'));
    return { fixture, el, type, submit };
  }

  afterEach(() => http.verify());

  it('sends the link with the return url and shows «Revisa tu correo»', async () => {
    const { fixture, el, type, submit } = render({ return: '/join/abc' });
    type('josep@example.com');
    submit();
    fixture.detectChanges();
    expect(el.textContent).toContain('Enviando…');

    const req = http.expectOne('/api/auth/magic-link');
    expect(req.request.body).toEqual({ email: 'josep@example.com', returnUrl: '/join/abc' });
    req.flush(null, { status: 202, statusText: 'Accepted' });
    await fixture.whenStable();
    fixture.detectChanges();

    expect(el.querySelector('[data-testid="login-link-sent"]')?.textContent).toContain('josep@example.com');
    el.querySelector<HTMLButtonElement>('[data-testid="login-resend"]')!.click();
    fixture.detectChanges();
    expect(el.querySelector('[data-testid="login-email"]')).not.toBeNull();
  });

  it('shows the error when sending fails', async () => {
    const { fixture, el, type, submit } = render();
    expect(el.querySelector('[data-testid="login-error"]')).toBeNull();
    type('josep@example.com');
    submit();
    http.expectOne('/api/auth/magic-link').flush(null, { status: 503, statusText: 'Unavailable' });
    await fixture.whenStable();
    fixture.detectChanges();
    expect(el.querySelector('[data-testid="login-error"]')?.textContent).toContain('No hemos podido iniciar sesión.');
  });

  it('shows the error when the API sent the browser back with ?error', () => {
    const { el } = render({ error: 'link' });
    expect(el.querySelector('[data-testid="login-error"]')).not.toBeNull();
  });

  it('does nothing without an email', () => {
    const { submit } = render();
    submit();
    http.expectNone('/api/auth/magic-link');
  });
});
