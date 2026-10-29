import { Component, input } from '@angular/core';

/** A screen with only its page header: the shell tests route to it. */
@Component({
  selector: 'la-placeholder',
  template: `<section class="screen active" [attr.data-screen]="'screen-' + screen()">
    <header class="page-header"><h1 class="ph-title">{{ title() }}</h1></header>
  </section>`,
})
export class Placeholder {
  readonly screen = input.required<string>();
  readonly title = input.required<string>();
}
