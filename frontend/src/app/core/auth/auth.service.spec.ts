import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { fakeAsync, TestBed, tick } from '@angular/core/testing';

import { API_BASE_URL } from '../api/api-base-url.token';
import { AuthService } from './auth.service';

function jwt(payload: object): string {
  const encode = (value: object) => btoa(JSON.stringify(value))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  return `${encode({ alg: 'none' })}.${encode(payload)}.signature`;
}

describe('AuthService', () => {
  let service: AuthService;
  let http: HttpTestingController;

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: 'http://localhost:8080' }
      ]
    });
    service = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    sessionStorage.clear();
  });

  it('autentica, persiste a sessão e expõe username e papel', () => {
    const token = jwt({ sub: 'admin', authorities: ['ROLE_ADMIN'], exp: Math.floor(Date.now() / 1000) + 3600 });

    service.login({ username: 'admin', password: 'segredo123' }).subscribe();

    const request = http.expectOne('http://localhost:8080/api/auth/login');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ username: 'admin', password: 'segredo123' });
    request.flush({ token, tipo: 'Bearer', expiresIn: 3600 });

    expect(service.token()).toBe(token);
    expect(service.username()).toBe('admin');
    expect(service.hasRole('ADMIN')).toBeTrue();
    expect(sessionStorage.getItem('gestao-acao.auth-token')).toBe(token);
  });

  it('descarta token expirado ao restaurar a sessão', () => {
    sessionStorage.setItem('gestao-acao.auth-token', jwt({
      sub: 'user', authorities: ['ROLE_USER'], exp: 1
    }));

    service.restoreSession();

    expect(service.isAuthenticated()).toBeFalse();
    expect(sessionStorage.getItem('gestao-acao.auth-token')).toBeNull();
  });

  it('limpa a sessão no logout', () => {
    sessionStorage.setItem('gestao-acao.auth-token', jwt({
      sub: 'user', authorities: ['ROLE_USER'], exp: Math.floor(Date.now() / 1000) + 3600
    }));
    service.restoreSession();

    service.logout();

    expect(service.isAuthenticated()).toBeFalse();
    expect(sessionStorage.getItem('gestao-acao.auth-token')).toBeNull();
  });
  it('encerra a sessão quando o JWT expira sem precisar de nova requisição', fakeAsync(() => {
    sessionStorage.setItem('gestao-acao.auth-token', jwt({
      sub: 'user', authorities: ['ROLE_USER'], exp: Math.floor(Date.now() / 1000) + 2
    }));
    service.restoreSession();
    expect(service.isAuthenticated()).toBeTrue();
    tick(2100);
    expect(service.isAuthenticated()).toBeFalse();
    expect(service.token()).toBeNull();
    expect(sessionStorage.getItem('gestao-acao.auth-token')).toBeNull();
    service.logout();
  }));

  it('rejeita resposta de login com token inválido e não anuncia sucesso', () => {
    let failed = false;
    let succeeded = false;
    service.login({ username: 'user', password: 'ficticia' }).subscribe({
      next: () => succeeded = true, error: () => failed = true
    });
    http.expectOne('http://localhost:8080/api/auth/login').flush({ token: 'invalido', tipo: 'Bearer', expiresIn: 3600 });
    expect(failed).toBeTrue();
    expect(succeeded).toBeFalse();
    expect(service.isAuthenticated()).toBeFalse();
  });

  it('descarta estrutura JWT incompleta e perfis desconhecidos', () => {
    const payload = { sub: 'user', authorities: ['ROLE_USER'], exp: Math.floor(Date.now() / 1000) + 3600 };
    for (const token of [jwt(payload).split('.').slice(0, 2).join('.'), jwt({ ...payload, authorities: ['ROLE_DESCONHECIDO'] })]) {
      sessionStorage.setItem('gestao-acao.auth-token', token);
      service.restoreSession();
      expect(service.isAuthenticated()).toBeFalse();
    }
    service.logout();
  });
});
