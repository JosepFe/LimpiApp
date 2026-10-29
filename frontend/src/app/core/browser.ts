import { InjectionToken } from '@angular/core';

/** Full-page navigations (to the API's sign-in redirects): a token so tests can stub them. */
export const BROWSER_LOCATION = new InjectionToken<Pick<Location, 'assign'>>('BROWSER_LOCATION', {
  providedIn: 'root',
  factory: () => window.location,
});

/** `window.prompt`, as a token so tests can answer it. */
export const BROWSER_PROMPT = new InjectionToken<(message: string) => string | null>('BROWSER_PROMPT', {
  providedIn: 'root',
  factory: () => (message: string) => window.prompt(message),
});

/** `window.confirm`, as a token so tests can answer it. */
export const BROWSER_CONFIRM = new InjectionToken<(message: string) => boolean>('BROWSER_CONFIRM', {
  providedIn: 'root',
  factory: () => (message: string) => window.confirm(message),
});
