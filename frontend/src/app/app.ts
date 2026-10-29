import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { InstallService } from './core/install';
import { ThemeService } from './core/theme';

@Component({
  selector: 'la-root',
  imports: [RouterOutlet],
  template: '<router-outlet />',
})
export class App {
  constructor() {
    inject(ThemeService); // applies the signed-in user's theme from the start
    inject(InstallService); // the browser may offer the install before Ajustes opens
  }
}
