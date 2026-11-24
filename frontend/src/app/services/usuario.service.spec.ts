import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_BASE_URL } from '../core/api/api-base-url.token';
import { UsuarioService } from './usuario.service';

describe('UsuarioService contratos HTTP', () => {
  let service: UsuarioService;
  let http: HttpTestingController;
  const user = { id: 4, username: 'operador', papel: 'USER' as const, ativo: true };
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting(),
      { provide: API_BASE_URL, useValue: 'http://localhost:8080/' }] });
    service = TestBed.inject(UsuarioService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());
  it('lista usuários sem duplicar separador na URL', () => {
    service.listar().subscribe(users => expect(users).toEqual([user]));
    const request = http.expectOne('http://localhost:8080/api/usuarios');
    expect(request.request.method).toBe('GET'); request.flush([user]);
  });
  it('cadastra com os campos do DTO de criação', () => {
    const body = { username: 'operador', password: 'senha-ficticia', papel: 'USER' as const };
    service.cadastrar(body).subscribe();
    const request = http.expectOne('http://localhost:8080/api/usuarios');
    expect(request.request.method).toBe('POST'); expect(request.request.body).toEqual(body); request.flush(user);
  });
  it('edita perfil e status sem enviar senha', () => {
    const body = { username: 'operador', papel: 'USER' as const, ativo: false };
    service.atualizar(4, body).subscribe();
    const request = http.expectOne('http://localhost:8080/api/usuarios/4');
    expect(request.request.method).toBe('PUT'); expect(request.request.body).toEqual(body); request.flush(user);
  });
  it('altera senha no endpoint dedicado e aceita resposta 204', () => {
    service.alterarSenha(4, 'senha-ficticia').subscribe();
    const request = http.expectOne('http://localhost:8080/api/usuarios/4/senha');
    expect(request.request.method).toBe('PUT'); expect(request.request.body).toEqual({ password: 'senha-ficticia' });
    request.flush(null, { status: 204, statusText: 'No Content' });
  });
});
