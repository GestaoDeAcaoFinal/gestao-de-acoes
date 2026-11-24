import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';

import { AuthService } from './auth.service';
import { authInterceptor } from './auth.interceptor';
import { API_BASE_URL } from '../api/api-base-url.token';
import { ApiError, apiErrorInterceptor } from '../api/api-error.interceptor';

describe('authInterceptor', () => {
  const auth = jasmine.createSpyObj<AuthService>('AuthService', ['logout', 'restoreSession'], { token: signal<string | null>('jwt-token') });

  beforeEach(() => { auth.logout.calls.reset(); TestBed.configureTestingModule({
    providers: [
      provideHttpClient(withInterceptors([authInterceptor, apiErrorInterceptor])),
      provideHttpClientTesting(),
      provideRouter([]),
      { provide: API_BASE_URL, useValue: 'http://localhost:8080' },
      { provide: AuthService, useValue: auth }
    ]
  }); });

  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('encerra sessão e preserva destino ao receber 401 normalizado', () => {
    const router = TestBed.inject(Router);
    spyOnProperty(router, 'url', 'get').and.returnValue('/carteira');
    const navigate = spyOn(router, 'navigate').and.resolveTo(true);
    let received: ApiError | undefined;
    TestBed.inject(HttpClient).get('http://localhost:8080/acoes').subscribe({ error: e => received = e });
    TestBed.inject(HttpTestingController).expectOne('http://localhost:8080/acoes').flush(null, { status: 401, statusText: 'Unauthorized' });
    expect(auth.logout).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith(['/login'], { queryParams: { returnUrl: '/carteira' } });
    expect(received?.status).toBe(401);
  });

  it('preserva sessão em 403 e em credenciais de login rejeitadas', () => {
    const navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
    for (const [url, status] of [['http://localhost:8080/api/usuarios', 403], ['http://localhost:8080/api/auth/login', 401]] as const) {
      TestBed.inject(HttpClient).get(url).subscribe({ error: () => {} });
      TestBed.inject(HttpTestingController).expectOne(url).flush(null, { status, statusText: 'Rejected' });
    }
    expect(auth.logout).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
  });

  it('adiciona Bearer token nas chamadas protegidas', () => {
    const http = TestBed.inject(HttpClient);
    const controller = TestBed.inject(HttpTestingController);
    http.get('http://localhost:8080/acoes').subscribe();
    const request = controller.expectOne('http://localhost:8080/acoes');
    expect(request.request.headers.get('Authorization')).toBe('Bearer jwt-token');
    request.flush([]);
  });
  it('não envia token para outra origem nem para o login', () => {
    const http = TestBed.inject(HttpClient);
    const controller = TestBed.inject(HttpTestingController);
    for (const url of ['https://example.com/dados', 'http://localhost:8080/api/auth/login']) {
      http.get(url).subscribe();
      const request = controller.expectOne(url);
      expect(request.request.headers.has('Authorization')).toBeFalse();
      request.flush({});
    }
    controller.verify();
  });
});
