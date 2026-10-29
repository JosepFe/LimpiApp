import { Component, input, output } from '@angular/core';

/**
 * A bottom sheet of the prototype (`.overlay.open > .sheet`): screens like #screen-home-switcher.
 * The overlay carries `data-screen="screen-<id>"` (parity) and the sheet `data-testid="sheet-<id>"`.
 */
@Component({
  selector: 'la-sheet',
  template: `
    <div class="overlay open" [attr.data-screen]="'screen-' + screen()" role="dialog" aria-modal="true" [attr.aria-label]="title()">
      <div class="scrim" aria-hidden="true" (click)="closed.emit()"></div>
      <div class="sheet" [class.full]="full()" [attr.data-testid]="'sheet-' + screen()">
        <div class="sheet-handle"></div>
        <div class="sheet-head">
          <h2>{{ title() }}</h2>
          <button type="button" class="icon-btn" aria-label="Cerrar" data-testid="sheet-close" (click)="closed.emit()">
            <svg class="ic" aria-hidden="true"><use href="icons.svg#i-x" /></svg>
          </button>
        </div>
        <div class="sheet-body"><ng-content /></div>
        <ng-content select="[sheet-foot]" />
      </div>
    </div>
  `,
  host: { '(document:keydown.escape)': 'closed.emit()' },
})
export class Sheet {
  readonly screen = input.required<string>();
  readonly title = input.required<string>();
  /** Full-screen sheet (`k:'full'` in the prototype: task and room forms). */
  readonly full = input(false);
  readonly closed = output();
}
