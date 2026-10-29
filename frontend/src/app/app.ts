import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ThemeService } from './core/theme';

@Component({
  selector: 'la-root',
  imports: [RouterOutlet],
  template: '<router-outlet />',
})
export class App {
  constructor() {
    inject(ThemeService); // applies the signed-in user's theme from the start
  }
}
