import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SessionStore } from './session.store';

/** Signed-in screens: without a session, to the login, coming back here afterwards. */
export const authGuard: CanActivateFn = async (_route, state) => {
  const session = inject(SessionStore);
  const router = inject(Router); // before the await: inject() needs the injection context
  if (await session.ensureLoaded()) return true;
  return router.createUrlTree(['/login'], { queryParams: { return: state.url } });
};

/** Household screens: a user without a household goes to create one. Without a session, authGuard decides. */
export const householdGuard: CanActivateFn = async () => {
  const session = inject(SessionStore);
  const router = inject(Router);
  const signedIn = await session.ensureLoaded();
  return !signedIn || session.household() ? true : router.createUrlTree(['/onboarding']);
};
