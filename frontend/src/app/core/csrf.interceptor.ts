import { HttpInterceptorFn } from '@angular/common/http';

/** Every API request carries `X-Requested-With: limpiapp`: the API rejects changes without it (CSRF, E02 D4). */
export const csrfInterceptor: HttpInterceptorFn = (req, next) =>
  next(req.url.startsWith('/api/') ? req.clone({ setHeaders: { 'X-Requested-With': 'limpiapp' } }) : req);
