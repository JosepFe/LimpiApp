import { InjectionToken } from '@angular/core';

/** Full-page navigations (to the API's sign-in redirects): a token so tests can stub them. */
export const BROWSER_LOCATION = new InjectionToken<Pick<Location, 'assign'>>('BROWSER_LOCATION', {
  providedIn: 'root',
  factory: () => window.location,
});
