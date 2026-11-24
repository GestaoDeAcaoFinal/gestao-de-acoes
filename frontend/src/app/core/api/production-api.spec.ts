import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { authInterceptor } from '../auth/auth.interceptor';
import { API_BASE_URL } from './api-base-url.token';
import { apiErrorInterceptor } from './api-error.interceptor';
import { environment } from '../../../environments/environment.production';
import { AcaoService } from '../../services/acao.service';
import { UsuarioService } from '../../services/usuario.service';

describe('Contratos HTTP no ambiente de produção', () => {
  let http: HttpTestingController;
  let auth: AuthService;
  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({ providers: [
      provideHttpClient(withInterceptors([authInterceptor, apiErrorInterceptor])),
      provideHttpClientTesting(), provideRouter([]),
      { provide: API_BASE_URL, useValue: environment.apiBaseUrl }
    ] });
    http = TestBed.inject(HttpTestingController);
    auth = TestBed.inject(AuthService);
  });
  afterEach(() => { http.verify(); auth.logout(); });

  it('autentica e envia Bearer usando os prefixos esperados pelo proxy atual', () => {
    const payload = { sub: 'teste', authorities: ['ROLE_ADMIN'], exp: Math.floor(Date.now() / 1000) + 60 };
    const encoded = (object: object) => btoa(JSON.stringify(object)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    const token = `${encoded({ alg: 'HS256' })}.${encoded(payload)}.assinaturaFicticia`;
    auth.login({ username: 'teste', password: 'senha-ficticia' }).subscribe();
    const login = http.expectOne('/api/api/auth/login');
    expect(login.request.headers.has('Authorization')).toBeFalse();
    login.flush({ token, tipo: 'Bearer', expiresIn: 60 });

    TestBed.inject(AcaoService).listar().subscribe();
    const acoes = http.expectOne('/api/acoes');
    expect(acoes.request.headers.get('Authorization')).toBe(`Bearer ${token}`);
    acoes.flush([]);

    TestBed.inject(UsuarioService).listar().subscribe();
    const users = http.expectOne('/api/api/usuarios');
    expect(users.request.headers.get('Authorization')).toBe(`Bearer ${token}`);
    users.flush([]);
  });

  it('não envia o JWT da sessão a um serviço externo', () => {
    TestBed.inject(HttpClient).get('https://example.com/dados').subscribe();
    const request = http.expectOne('https://example.com/dados');
    expect(request.request.headers.has('Authorization')).toBeFalse();
    request.flush({});
  });
});
