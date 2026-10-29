import { Component, signal } from '@angular/core';

export const TIME_ZONES = ['Europe/Madrid', 'Atlantic/Canary', 'Europe/London'];

/** #screen-onboarding: create the first household (E02/US-006 name and time zone; US-007 templates). */
@Component({
  selector: 'la-onboarding',
  templateUrl: './onboarding.html',
})
export class Onboarding {
  protected readonly timeZones = TIME_ZONES;
  protected readonly step = signal<'name' | 'templates'>('name');
  protected readonly name = signal('');
  protected readonly timeZone = signal(TIME_ZONES[0]);
  protected readonly nameInvalid = signal(false);
  protected readonly failed = signal(false);

  protected next(): void {
    if (!this.name().trim()) {
      this.nameInvalid.set(true);
      return;
    }
    this.nameInvalid.set(false);
    this.step.set('templates');
  }
}
