import { ToastService } from './toast';

describe('ToastService', () => {
  it('shows one message, runs its action once and goes away by itself', async () => {
    vi.useFakeTimers();
    const toast = new ToastService();
    const run = vi.fn();
    toast.show('Tarea completada', { label: 'Deshacer', run });
    expect(toast.current()?.text).toBe('Tarea completada');
    await toast.act();
    expect(run).toHaveBeenCalledTimes(1);
    expect(toast.current()).toBeNull();

    toast.show('Hola');
    vi.advanceTimersByTime(ToastService.DURATION);
    expect(toast.current()).toBeNull();
    vi.useRealTimers();
  });
});
