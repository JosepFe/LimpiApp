import { Injectable, signal } from '@angular/core';

/** Something changed in a sheet (a task saved, a room archived…): screens that read `version()` reload. */
@Injectable({ providedIn: 'root' })
export class RefreshBus {
  readonly version = signal(0);

  bump(): void {
    this.version.update((v) => v + 1);
  }
}
