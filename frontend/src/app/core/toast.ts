import { Injectable, signal } from '@angular/core';

export interface ToastAction {
  label: string;
  run: () => void | Promise<void>;
}

export interface ToastMessage {
  text: string;
  action?: ToastAction;
}

/** The prototype's toast («Tarea completada · Deshacer»): one at a time, it goes after a few seconds. */
@Injectable({ providedIn: 'root' })
export class ToastService {
  static readonly DURATION = 8000;
  readonly current = signal<ToastMessage | null>(null);
  private timer?: ReturnType<typeof setTimeout>;

  show(text: string, action?: ToastAction): void {
    clearTimeout(this.timer);
    this.current.set({ text, action });
    this.timer = setTimeout(() => this.current.set(null), ToastService.DURATION);
  }

  async act(): Promise<void> {
    const action = this.current()?.action;
    this.hide();
    await action?.run();
  }

  hide(): void {
    clearTimeout(this.timer);
    this.current.set(null);
  }
}
