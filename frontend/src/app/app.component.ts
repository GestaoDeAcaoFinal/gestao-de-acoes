import { Component, ElementRef, HostListener, effect, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';
import { LucideAngularModule, ChevronDown, Users, LogOut, Plus } from 'lucide-angular';
import { AuthService } from './core/auth/auth.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, LucideAngularModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  readonly icons = { ChevronDown, Users, LogOut, Plus };
  title = 'Gestão de Ações';
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly element: ElementRef<HTMLElement> = inject(ElementRef);
  readonly menuOpen = signal(false);
  private hadSession = false;
  private readonly sessionWatcher = effect(() => {
    const authenticated = this.auth.isAuthenticated();
    if (this.hadSession && !authenticated && !this.router.url.startsWith('/login')) {
      void this.router.navigate(['/login'], { queryParams: { returnUrl: this.router.url } });
    }
    this.hadSession = authenticated;
  });

  constructor() {
    this.router.events.pipe(filter(event => event instanceof NavigationEnd), takeUntilDestroyed())
      .subscribe(() => this.menuOpen.set(false));
  }

  toggleMenu(): void { this.menuOpen.update(open => !open); }

  @HostListener('document:pointerdown', ['$event'])
  closeOutside(event: PointerEvent): void {
    const account = this.element.nativeElement.querySelector('.account');
    if (!account?.contains(event.target as Node)) this.menuOpen.set(false);
  }

  @HostListener('document:keydown.escape')
  closeWithEscape(): void {
    if (!this.menuOpen()) return;
    this.menuOpen.set(false);
    this.element.nativeElement.querySelector<HTMLButtonElement>('.account-trigger')?.focus();
  }

  logout(): void {
    this.menuOpen.set(false);
    this.auth.logout();
    void this.router.navigate(['/login']);
  }
}
