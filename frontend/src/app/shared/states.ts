import { Component, input, output } from '@angular/core';

/** The skeleton rows of the prototype's `loading` states. */
@Component({
  selector: 'la-skeleton-list',
  template: `<div class="list">
    @for (row of rowList(); track $index) {
      <div class="row"><span class="skel" style="width:36px;height:36px;border-radius:50%"></span><span class="body"><span class="skel" style="display:block;height:14px;width:60%;margin-bottom:8px"></span><span class="skel" style="display:block;height:12px;width:40%"></span></span><span class="skel" style="width:64px;height:22px"></span></div>
    }
  </div>`,
})
export class SkeletonList {
  readonly rows = input(3);
  protected rowList(): number[] {
    return Array.from({ length: this.rows() });
  }
}

/** «⚠️ Algo ha salido mal» with «Reintentar», the `error` state of every screen. */
@Component({
  selector: 'la-error-state',
  template: `<div class="empty"><div class="big" aria-hidden="true">⚠️</div><h3>Algo ha salido mal</h3><p>{{ message() }}</p><button type="button" class="btn btn-secondary" data-testid="retry" (click)="retry.emit()">Reintentar</button></div>`,
})
export class ErrorState {
  readonly message = input('No hemos podido cargar los datos.');
  readonly retry = output();
}

export type LoadState = 'loading' | 'ready' | 'error';
