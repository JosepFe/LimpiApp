import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { BROWSER_CONFIRM } from '../../core/browser';
import { HouseholdApi } from '../../core/household-api';
import { SessionStore } from '../../core/session.store';
import { ToastService } from '../../core/toast';
import { initial } from '../../shared/avatar';
import { dayMonthYear } from '../../shared/dates';
import { ErrorState, LoadState, SkeletonList } from '../../shared/states';
import { Member, ROLE_LABEL } from './household.model';
import { Invite } from './invite';

/** #screen-members: who is in the household, invite (owners), leave or remove someone (E06/US-002). */
@Component({
  selector: 'la-members',
  imports: [RouterLink, SkeletonList, ErrorState, Invite],
  templateUrl: './members.html',
})
export class Members implements OnInit {
  private readonly api = inject(HouseholdApi);
  private readonly router = inject(Router);
  private readonly confirm = inject(BROWSER_CONFIRM);
  private readonly toast = inject(ToastService);
  protected readonly session = inject(SessionStore);
  protected readonly state = signal<LoadState>('loading');
  protected readonly members = signal<Member[]>([]);
  protected readonly isOwner = computed(() => this.session.household()?.role === 'owner');
  protected readonly initial = initial;
  protected readonly roleLabel = ROLE_LABEL;
  protected readonly since = (m: Member) => `Desde ${dayMonthYear(m.joinedOn)}`;
  /** «Invitar» opens #screen-invite over Miembros with `?sheet=invite` (owners only). */
  private readonly query = toSignal(inject(ActivatedRoute).queryParamMap);
  protected readonly inviting = computed(() => this.query()?.get('sheet') === 'invite' && this.isOwner());

  ngOnInit(): void {
    void this.load();
  }

  protected async load(): Promise<void> {
    this.state.set('loading');
    try {
      this.members.set(await this.api.get<Member[]>('/members'));
      this.state.set('ready');
    } catch {
      this.state.set('error');
    }
  }

  protected closeInvite(): void {
    void this.router.navigate([], { queryParams: { sheet: null }, queryParamsHandling: 'merge', replaceUrl: true });
  }

  protected isMe(member: Member): boolean {
    return member.id === this.session.me()?.id;
  }

  /** «Salir»: then another household, or the onboarding if there is none left. */
  protected async leave(member: Member): Promise<void> {
    const household = this.session.household();
    if (!household || !this.confirm(`¿Salir de ${household.name}? Tus tareas quedarán sin asignar.`)) return;
    try {
      await this.api.delete(`/members/${member.id}`);
    } catch (error) {
      this.toast.show(problem(error, 'No hemos podido sacarte del hogar.'));
      return;
    }
    this.toast.show('Has salido del hogar');
    await this.session.load();
    const next = this.session.me()?.households[0];
    if (next) {
      this.session.selectHousehold(next.id);
      await this.router.navigateByUrl('/today');
    } else {
      await this.router.navigateByUrl('/onboarding');
    }
  }

  /** «Acciones de Pau»: owners remove someone (changing roles is v2). */
  protected async remove(member: Member): Promise<void> {
    if (!this.confirm(`¿Quitar a ${member.name} del hogar? Sus tareas quedarán sin asignar.`)) return;
    try {
      await this.api.delete(`/members/${member.id}`);
    } catch (error) {
      this.toast.show(problem(error, `No hemos podido quitar a ${member.name}.`));
      return;
    }
    this.members.update((list) => list.filter((m) => m.id !== member.id));
    this.toast.show(`${member.name} ya no está en el hogar`);
    void this.session.load();
  }
}

/** The API's own message (409: «Eres el único propietario…»), or a generic one. */
function problem(error: unknown, fallback: string): string {
  const detail = error instanceof HttpErrorResponse ? (error.error as { detail?: unknown } | null)?.detail : undefined;
  return typeof detail === 'string' ? detail : fallback;
}
