import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';
import { roleGuard } from './core/auth/role.guard';

export const routes: Routes = [
  { path: 'login', loadComponent: () => import('./pages/login/login.component').then(m => m.LoginComponent) },
  { path: 'usuarios', loadComponent: () => import('./pages/usuarios/usuarios.component').then(m => m.UsuariosComponent), canActivate: [authGuard, roleGuard], data: { roles: ['ADMIN'] } },
  { path: '', loadComponent: () => import('./pages/home/home.component').then(m => m.HomeComponent), canActivate: [authGuard] },

  { path: 'carteira', loadComponent: () => import('./pages/carteira/carteira.component').then(m => m.CarteiraComponent), canActivate: [authGuard] },

  { path: 'corretoras/nova', loadComponent: () => import('./pages/corretora-form/corretora-form.component').then(m => m.CorretoraFormComponent), canActivate: [authGuard, roleGuard], data: { roles: ['ADMIN'] } },
  { path: 'corretoras', loadComponent: () => import('./pages/corretora-list/corretora-list.component').then(m => m.CorretoraListComponent), canActivate: [authGuard] },

  { path: 'acoes/nova', loadComponent: () => import('./pages/acao-form/acao-form.component').then(m => m.AcaoFormComponent), canActivate: [authGuard, roleGuard], data: { roles: ['ADMIN'] } },
  { path: 'acoes', loadComponent: () => import('./pages/acao-list/acao-list.component').then(m => m.AcaoListComponent), canActivate: [authGuard] },

  { path: 'operacoes/nova', loadComponent: () => import('./pages/operacao-form/operacao-form.component').then(m => m.OperacaoFormComponent), canActivate: [authGuard] },
  { path: 'operacoes', loadComponent: () => import('./pages/operacao-list/operacao-list.component').then(m => m.OperacaoListComponent), canActivate: [authGuard] },
  { path: '**', redirectTo: '' }
];
