import { Component, computed, input, output } from '@angular/core';
import { initial } from './avatar';
import { TaskSummary } from './task.model';

/**
 * A task of a list (`task-row`): check, room emoji, title, «Cocina · Horno · 45 min», due badge and assignee.
 * In a room the room name is left out («Nevera · 30 min»).
 */
@Component({
  selector: 'la-task-row',
  template: `@let t = task();
    <div class="row" role="button" tabindex="0" data-testid="task-row" (click)="opened.emit()" (keydown.enter)="opened.emit()">
      <button type="button" class="tc-hit" data-testid="task-check" [attr.aria-label]="'Marcar hecha: ' + t.title" [disabled]="!checkable()"
              (click)="$event.stopPropagation(); checked.emit()"><span class="task-check"><svg class="ic sm" aria-hidden="true"><use href="icons.svg#i-check" /></svg></span></button>
      <span class="emo" aria-hidden="true">{{ t.roomEmoji }}</span>
      <span class="body"><span class="t" style="display:block">{{ t.title }}</span><span class="s">@if (place(); as p) {<span>{{ p }}</span>{{ ' ' }}<span aria-hidden="true">·</span>{{ ' ' }}}<span><svg class="ic sm" aria-hidden="true"><use href="icons.svg#i-clock" /></svg> {{ t.estimatedMinutes }} min</span></span></span>
      <span class="end"><span class="badge" [class]="t.due.kind">{{ t.due.label }}</span>@if (t.assignee; as a) {<span class="avatar sm" [class]="a.avatarColor" [title]="a.name" [attr.aria-label]="a.name">{{ initial(a.name) }}</span>} @else {<span class="badge neutral">Sin asignar</span>}</span>
    </div>`,
})
export class TaskRow {
  readonly task = input.required<TaskSummary>();
  /** Show the room in the subtitle (Hoy) or only the zone (a room's detail). */
  readonly showRoom = input(false);
  /** «Marcar hecha» works from E04/US-005. */
  readonly checkable = input(false);
  readonly opened = output();
  readonly checked = output();
  protected readonly initial = initial;
  protected readonly place = computed(() => {
    const t = this.task();
    return [this.showRoom() ? t.roomName : null, t.zone?.name].filter(Boolean).join(' · ') || null;
  });
}
