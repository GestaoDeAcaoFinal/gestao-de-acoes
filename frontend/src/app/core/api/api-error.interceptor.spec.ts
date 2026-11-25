import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { ApiError, apiErrorInterceptor } from './api-error.interceptor';
import { ProblemDetail } from './api.models';

describe('apiErrorInterceptor', () => {
  let http: HttpClient;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([apiErrorInterceptor])),
        provideHttpClientTesting()
      ]
    });
    http = TestBed.inject(HttpClient);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  it('preserva o prazo e o identificador da espera local', () => {
    let received: ApiError | undefined;
    http.get('/resource').subscribe({ error: error => received = error });
    httpTesting.expectOne('/resource').flush({ status: 503, title: 'Cota', detail: 'Aguarde',
      codigo: 'AGUARDANDO_COTA', tentarAposSegundos: 61 }, { status: 503, statusText: 'Service Unavailable' });
    expect(received?.code).toBe('AGUARDANDO_COTA');
    expect(received?.retryAfterSeconds).toBe(61);
  });

  for (const prazo of [0, -1, 1.5, '2', 86401, null]) {
    it('não agenda espera com prazo inválido: ' + prazo, () => {
      let received: ApiError | undefined;
      http.get('/resource').subscribe({ error: error => received = error });
      httpTesting.expectOne('/resource').flush({ status: 503, title: 'Cota', detail: 'Aguarde',
        codigo: 'AGUARDANDO_COTA', tentarAposSegundos: prazo }, { status: 503, statusText: 'Service Unavailable' });
      expect(received?.retryAfterSeconds).toBeUndefined();
    });
  }

  [400, 404, 409, 422, 502, 503].forEach(status => {
    it(`preserva ProblemDetail e erros por campo para status ${status}`, () => {
      const problem: ProblemDetail = {
        status,
        title: `Título ${status}`,
        detail: `Detalhe ${status}`,
        errors: { ticker: ['Ticker inválido'] }
      };
      let received: ApiError | undefined;

      http.get('/resource').subscribe({ error: error => received = error });
      httpTesting.expectOne('/resource').flush(problem, { status, statusText: 'Erro' });

      expect(received).toEqual(jasmine.any(ApiError));
      expect(received?.status).toBe(status);
      expect(received?.title).toBe(problem.title);
      expect(received?.message).toBe(problem.detail);
      expect(received?.fieldErrors).toEqual(problem.errors!);
    });
  });

  it('produz fallback estável quando a API está inacessível', () => {
    let received: ApiError | undefined;

    http.get('/resource').subscribe({ error: error => received = error });
    httpTesting.expectOne('/resource').error(new ProgressEvent('error'));

    expect(received).toEqual(jasmine.any(ApiError));
    expect(received?.status).toBe(0);
    expect(received?.title).toBe('Falha de conexão');
    expect(received?.message).toBe('Não foi possível conectar à API. Tente novamente.');
    expect(received?.fieldErrors).toEqual({});
  });
  it('explica falta de permissão quando o filtro de segurança retorna 403 sem corpo', () => {
    let received: ApiError | undefined;
    http.get('/resource').subscribe({ error: error => received = error });
    httpTesting.expectOne('/resource').flush(null, { status: 403, statusText: 'Forbidden' });
    expect(received?.title).toBe('Acesso não permitido');
    expect(received?.message).toBe('Seu perfil não tem permissão para realizar esta ação.');
    expect(received?.status).toBe(403);
  });

  it('produz fallback estável para corpo de erro incompatível', () => {
    let received: ApiError | undefined;

    http.get('/resource').subscribe({ error: error => received = error });
    httpTesting.expectOne('/resource').flush('resposta inválida', {
      status: 500,
      statusText: 'Internal Server Error'
    });

    expect(received).toEqual(jasmine.any(ApiError));
    expect(received?.status).toBe(500);
    expect(received?.title).toBe('Erro inesperado');
    expect(received?.message).toBe('Não foi possível concluir a operação. Tente novamente.');
  });
});
