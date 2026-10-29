import { Component, DestroyRef, DOCUMENT, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';

/** #screen-ui-kit: the shared components, development only. `?theme=dark` shows the dark theme, as in the prototype. */
@Component({
  selector: 'la-ui-kit',
  imports: [RouterLink],
  templateUrl: './ui-kit.html',
})
export class UiKit {
  constructor() {
    const root = inject(DOCUMENT).documentElement;
    inject(ActivatedRoute)
      .queryParamMap.pipe(takeUntilDestroyed())
      .subscribe((params) => {
        if (params.get('theme') === 'dark') root.setAttribute('data-theme', 'dark');
        else root.removeAttribute('data-theme');
      });
    inject(DestroyRef).onDestroy(() => root.removeAttribute('data-theme'));
  }
}
