import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, provideRouter, Router, RouterStateSnapshot } from '@angular/router';
import { AuthService } from './auth.service';
import { authGuard } from './auth.guard';
import { roleGuard } from './role.guard';
import { routes } from '../../app.routes';

describe('Proteção de rotas', () => {
  const auth = { restoreSession: () => {}, isAuthenticated: () => false, hasRole: (_role: string) => false };
  beforeEach(() => {
    auth.isAuthenticated = () => false;
    auth.hasRole = () => false;
    TestBed.configureTestingModule({ providers: [provideRouter([]), { provide: AuthService, useValue: auth }] });
  });
  it('redireciona visitante ao login preservando o destino', () => {
    const result = TestBed.runInInjectionContext(() => authGuard({} as ActivatedRouteSnapshot, { url: '/carteira' } as RouterStateSnapshot));
    expect(TestBed.inject(Router).serializeUrl(result as never)).toBe('/login?returnUrl=%2Fcarteira');
  });
  it('permite usuário autenticado e bloqueia USER na administração', () => {
    auth.isAuthenticated = () => true;
    expect(TestBed.runInInjectionContext(() => authGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot))).toBeTrue();
    const route = { data: { roles: ['ADMIN'] } } as unknown as ActivatedRouteSnapshot;
    const denied = TestBed.runInInjectionContext(() => roleGuard(route, {} as RouterStateSnapshot));
    expect(TestBed.inject(Router).serializeUrl(denied as never)).toBe('/');
    auth.hasRole = role => role === 'ADMIN';
    expect(TestBed.runInInjectionContext(() => roleGuard(route, {} as RouterStateSnapshot))).toBeTrue();
  });
  it('protege todas as rotas administrativas reais com sessão e papel ADMIN', () => {
    for (const path of ['usuarios', 'acoes/nova', 'corretoras/nova']) {
      const route = routes.find(route => route.path === path);
      expect(route?.canActivate).toEqual([authGuard, roleGuard]);
      expect(route?.data?.['roles']).toEqual(['ADMIN']);
    }
    for (const path of ['', 'carteira', 'acoes', 'corretoras', 'operacoes', 'operacoes/nova']) {
      expect(routes.find(route => route.path === path)?.canActivate).toEqual([authGuard]);
    }
  });
});
