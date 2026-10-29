import { isDevMode } from '@angular/core';
import { Routes } from '@angular/router';
import { authGuard, householdGuard } from './core/guards';
import { Placeholder } from './features/placeholder/placeholder';
import { Shell } from './layout/shell';

/** Sections whose screen arrives in a later story: the shell already navigates to them. */
const placeholder = (path: string, screen: string, title: string) => ({
  path,
  component: Placeholder,
  data: { screen, title },
});

export const routes: Routes = [
  { path: 'login', loadComponent: () => import('./features/login/login').then((m) => m.Login) },
  // Replaced by the onboarding screen in E02/US-006.
  { path: 'onboarding', canActivate: [authGuard], component: Placeholder, data: { screen: 'onboarding', title: 'Crea tu hogar' } },
  {
    path: '',
    component: Shell,
    canActivate: [authGuard, householdGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'today' },
      placeholder('today', 'today', 'Hoy'),
      placeholder('rooms', 'rooms', 'Habitaciones'),
      placeholder('history', 'history', 'Actividad'),
      placeholder('stats', 'stats', 'Actividad'),
      placeholder('ranking', 'ranking', 'Hogar'),
      placeholder('members', 'members', 'Hogar'),
      placeholder('settings', 'settings', 'Ajustes'),
      placeholder('products', 'products', 'Productos'),
      {
        path: 'ui-kit',
        canMatch: [() => isDevMode()],
        loadComponent: () => import('./features/ui-kit/ui-kit').then((m) => m.UiKit),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
