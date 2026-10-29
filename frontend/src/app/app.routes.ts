import { isDevMode } from '@angular/core';
import { Routes } from '@angular/router';
import { authGuard, householdGuard } from './core/guards';
import { Shell } from './layout/shell';

export const routes: Routes = [
  { path: 'login', loadComponent: () => import('./features/login/login').then((m) => m.Login) },
  { path: 'join/:code', loadComponent: () => import('./features/join/join').then((m) => m.Join) },
  {
    path: 'onboarding',
    canActivate: [authGuard],
    loadComponent: () => import('./features/onboarding/onboarding').then((m) => m.Onboarding),
  },
  {
    path: '',
    component: Shell,
    canActivate: [authGuard, householdGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'today' },
      {
        path: 'today',
        loadComponent: () => import('./features/today/today').then((m) => m.Today),
        // The task detail belongs to Hoy in the prototype (its pane on desktop, «Hoy» lit in the navigation).
        children: [{ path: 'tasks/:id', loadComponent: () => import('./features/tasks/task-detail').then((m) => m.TaskDetail) }],
      },
      { path: 'tasks/:id', redirectTo: 'today/tasks/:id' },
      {
        path: 'rooms',
        loadComponent: () => import('./features/rooms/rooms').then((m) => m.Rooms),
        children: [{ path: ':id', loadComponent: () => import('./features/rooms/room-detail').then((m) => m.RoomDetail) }],
      },
      { path: 'history', loadComponent: () => import('./features/activity/history').then((m) => m.History) },
      { path: 'stats', loadComponent: () => import('./features/activity/stats').then((m) => m.Stats) },
      { path: 'ranking', loadComponent: () => import('./features/household/ranking').then((m) => m.Ranking) },
      { path: 'members', loadComponent: () => import('./features/household/members').then((m) => m.Members) },
      { path: 'settings', loadComponent: () => import('./features/settings/settings').then((m) => m.Settings) },
      { path: 'products', loadComponent: () => import('./features/products/products').then((m) => m.Products) },
      {
        path: 'ui-kit',
        canMatch: [() => isDevMode()],
        loadComponent: () => import('./features/ui-kit/ui-kit').then((m) => m.UiKit),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
