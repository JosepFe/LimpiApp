import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HouseholdApi } from '../../core/household-api';
import { ErrorState, LoadState, SkeletonList } from '../../shared/states';

export interface Product {
  id: string;
  name: string;
  emoji: string;
  taskCount: number;
}

/** #screen-products: what the household uses to clean, and in how many tasks (E03/US-004). */
@Component({
  selector: 'la-products',
  imports: [RouterLink, SkeletonList, ErrorState],
  templateUrl: './products.html',
})
export class Products implements OnInit {
  private readonly api = inject(HouseholdApi);
  protected readonly state = signal<LoadState>('loading');
  protected readonly products = signal<Product[]>([]);
  protected readonly newName = signal('');
  /** «Añadir producto» of the empty state shows the form. */
  protected readonly adding = signal(false);

  ngOnInit(): void {
    void this.load();
  }

  protected async load(): Promise<void> {
    this.state.set('loading');
    try {
      this.products.set(await this.api.get<Product[]>('/products'));
      this.state.set('ready');
    } catch {
      this.state.set('error');
    }
  }

  protected async add(): Promise<void> {
    const name = this.newName().trim();
    if (!name) return;
    const product = await this.api.post<Product>('/products', { name });
    this.products.update((list) => [...list, product]);
    this.newName.set('');
  }

  protected async archive(product: Product): Promise<void> {
    await this.api.delete(`/products/${product.id}`);
    this.products.update((list) => list.filter((p) => p.id !== product.id));
  }

  protected tasks(count: number): string {
    return `Usado en ${count} ${count === 1 ? 'tarea' : 'tareas'}`;
  }
}
