import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { csrfInterceptor } from './csrf.interceptor';

describe('csrfInterceptor', () => {
  it('adds X-Requested-With to API requests only', () => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(withInterceptors([csrfInterceptor])), provideHttpClientTesting()] });
    const http = TestBed.inject(HttpClient);
    const ctrl = TestBed.inject(HttpTestingController);

    http.post('/api/auth/logout', null).subscribe();
    http.get('/icons.svg', { responseType: 'text' }).subscribe();

    expect(ctrl.expectOne('/api/auth/logout').request.headers.get('X-Requested-With')).toBe('limpiapp');
    expect(ctrl.expectOne('/icons.svg').request.headers.has('X-Requested-With')).toBe(false);
  });
});
