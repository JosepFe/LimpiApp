import { Component, computed, input } from '@angular/core';

export interface Health {
  value: number;
  label: string;
  /** ok · good · warn · bad: the ring colour (`h-ok`…) */
  level: string;
}

/** The health ring of the prototype (`.ring.h-good`), «–» when there is nothing to measure. */
@Component({
  selector: 'la-health-ring',
  template: `@if (health(); as h) {
      <span class="ring" [class]="'h-' + h.level + sizeClass()" [style.--v]="h.value" role="img" [attr.aria-label]="'Salud ' + h.value + '%'"><b>{{ h.value }}</b></span>
    } @else {
      <span class="ring" [class]="sizeClass()" style="--v:0"><b>–</b></span>
    }`,
})
export class HealthRing {
  readonly health = input<Health | null>(null);
  readonly size = input<'' | 'sm' | 'lg'>('');
  protected readonly sizeClass = computed(() => (this.size() ? ` ${this.size()}` : ''));
}
