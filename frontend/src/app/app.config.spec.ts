import { HttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { appConfig } from './app.config';
import { routes } from './app.routes';

describe('appConfig', () => {
  it('provides the router with the app routes and the HTTP client', () => {
    TestBed.configureTestingModule({ providers: appConfig.providers });

    expect(TestBed.inject(Router).config).toEqual(routes);
    expect(TestBed.inject(HttpClient)).toBeTruthy();
  });
});
