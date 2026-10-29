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

/** Clipboard and the share sheet (`navigator.share` exists on phones only), as a token so tests can replace them. */
export interface BrowserShare {
  copy(text: string): Promise<void>;
  share: ((data: ShareData) => Promise<void>) | null;
}

export const BROWSER_SHARE = new InjectionToken<BrowserShare>('BROWSER_SHARE', {
  providedIn: 'root',
  factory: () => ({
    copy: (text: string) => navigator.clipboard.writeText(text),
    share: typeof navigator.share === 'function' ? (data: ShareData) => navigator.share(data) : null,
  }),
});
