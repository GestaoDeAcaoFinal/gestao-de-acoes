import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';

import { API_BASE_URL } from '../core/api/api-base-url.token';
import { ApiError, apiErrorInterceptor } from '../core/api/api-error.interceptor';
import { Acao, AcaoRequest, Corretora, ProblemDetail } from '../core/api/api.models';
import { AcaoService } from './acao.service';

describe('AcaoService', () => {
  const apiBaseUrl = 'https://api.example.test';
  const corretora: Corretora = {
    id: 2,
    cnpj: '12345678000190',
    razaoSocial: 'Corretora Teste SA',
    nomeFantasia: 'Corretora Teste',
    email: 'contato@example.test',
    telefone: '1130000000',
    cep: '01001000',
    logradouro: 'Praça da Sé',
    numero: null,
    complemento: null,
    bairro: 'Sé',
    cidade: 'São Paulo',
    uf: 'SP',
    situacaoCadastral: 'ATIVA',
    validadaNaCvm: true,
    dataCadastro: '2026-09-04T08:00:00'
  };
  const acao: Acao = {
    id: 1,
    ticker: 'PETR4',
    nomeEmpresa: 'Petróleo Brasileiro SA',
    mercado: 'BR',
    moeda: 'BRL',
    cotacaoAtual: 32.5,
    dataHoraCotacao: '2026-09-04T08:30:00',
    corretoraRelacionada: corretora
  };

  let service: AcaoService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([apiErrorInterceptor])),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: apiBaseUrl }
      ]
    });
    service = TestBed.inject(AcaoService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  it('aguarda somente a cota local e mantém a fila brasileira ativa', fakeAsync(() => {
    let resultados: unknown;
    const espera = jasmine.createSpy('espera');
    service.atualizarTodasCotacoes(undefined, espera).subscribe(value => resultados = value);
    httpTesting.expectOne(`${apiBaseUrl}/acoes`).flush([acao, { ...acao, id: 2, ticker: 'AAPL', mercado: 'EUA' }]);
    httpTesting.expectOne(`${apiBaseUrl}/acoes/2/atualizar-cotacao`).flush({
      status: 503, title: 'Aguardando cota', detail: 'Aguarde', codigo: 'AGUARDANDO_COTA', tentarAposSegundos: 2
    }, { status: 503, statusText: 'Service Unavailable' });
    httpTesting.expectOne(`${apiBaseUrl}/acoes/1/atualizar-cotacao`).flush(acao);
    expect(espera).toHaveBeenCalledOnceWith(2);
    expect(resultados).toBeUndefined();
    tick(1999); httpTesting.expectNone(`${apiBaseUrl}/acoes/2/atualizar-cotacao`);
    tick(1); httpTesting.expectOne(`${apiBaseUrl}/acoes/2/atualizar-cotacao`).flush(acao);
    expect(resultados).toEqual([{ ticker: 'PETR4', sucesso: true }, { ticker: 'AAPL', sucesso: true }]);
  }));

  it('não repete falha externa mesmo que o provedor mencione limite', fakeAsync(() => {
    let resultados: unknown;
    service.atualizarTodasCotacoes().subscribe(value => resultados = value);
    httpTesting.expectOne(`${apiBaseUrl}/acoes`).flush([acao]);
    httpTesting.expectOne(`${apiBaseUrl}/acoes/1/atualizar-cotacao`).flush({
      status: 503, title: 'Provedor indisponível', detail: 'O limite de consultas foi atingido'
    }, { status: 503, statusText: 'Service Unavailable' });
    tick(120_000);
    httpTesting.expectNone(`${apiBaseUrl}/acoes/1/atualizar-cotacao`);
    expect(resultados).toEqual([{ ticker: 'PETR4', sucesso: false, erro: 'O limite de consultas foi atingido' }]);
  }));

  it('limita a repetição por cota local e permite cancelar a espera', fakeAsync(() => {
    let resultados: unknown;
    service.atualizarTodasCotacoes().subscribe(value => resultados = value);
    httpTesting.expectOne(`${apiBaseUrl}/acoes`).flush([acao]);
    for (let i = 0; i < 3; i++) {
      httpTesting.expectOne(`${apiBaseUrl}/acoes/1/atualizar-cotacao`).flush({
        status: 503, title: 'Cota', detail: 'Aguarde', codigo: 'AGUARDANDO_COTA', tentarAposSegundos: 1
      }, { status: 503, statusText: 'Service Unavailable' });
      tick(1000);
    }
    httpTesting.expectNone(`${apiBaseUrl}/acoes/1/atualizar-cotacao`);
    expect(resultados).toEqual([{ ticker: 'PETR4', sucesso: false, erro: 'Aguarde' }]);
    const subscription = service.atualizarTodasCotacoes().subscribe();
    httpTesting.expectOne(`${apiBaseUrl}/acoes`).flush([acao]);
    httpTesting.expectOne(`${apiBaseUrl}/acoes/1/atualizar-cotacao`).flush({
      status: 503, title: 'Cota', detail: 'Aguarde', codigo: 'AGUARDANDO_COTA', tentarAposSegundos: 1
    }, { status: 503, statusText: 'Service Unavailable' });
    subscription.unsubscribe(); tick(2000);
    httpTesting.expectNone(`${apiBaseUrl}/acoes/1/atualizar-cotacao`);
  }));

  it('interrompe ambas as filas quando a autenticação é recusada', () => {
    let falha: ApiError | undefined;
    service.atualizarTodasCotacoes().subscribe({ error: error => falha = error });
    httpTesting.expectOne(`${apiBaseUrl}/acoes`).flush([acao, { ...acao, id: 2, ticker: 'AAPL', mercado: 'EUA' }, { ...acao, id: 3 }]);
    const brasileira = httpTesting.expectOne(`${apiBaseUrl}/acoes/1/atualizar-cotacao`);
    httpTesting.expectOne(`${apiBaseUrl}/acoes/2/atualizar-cotacao`).flush({}, { status: 401, statusText: 'Unauthorized' });
    expect(falha?.status).toBe(401);
    expect(brasileira.cancelled).toBeTrue();
    httpTesting.expectNone(`${apiBaseUrl}/acoes/3/atualizar-cotacao`);
  });

  it('não deixa uma cotação americana lenta bloquear a fila brasileira', async () => {
    const result = firstValueFrom(service.atualizarTodasCotacoes());
    httpTesting.expectOne(`${apiBaseUrl}/acoes`).flush([
      { ...acao, id: 2, ticker: 'AAPL', mercado: 'EUA' }, acao
    ]);
    const americana = httpTesting.expectOne(`${apiBaseUrl}/acoes/2/atualizar-cotacao`);
    const brasileira = httpTesting.expectOne(`${apiBaseUrl}/acoes/1/atualizar-cotacao`);
    brasileira.flush(acao);
    americana.flush({ ...acao, id: 2, ticker: 'AAPL', mercado: 'EUA' });
    expect((await result).map(item => item.ticker)).toEqual(['AAPL', 'PETR4']);
  });

  it('informa progresso após cada resposta sem emitir resultado final antecipado', async () => {
    const progress = jasmine.createSpy('progress');
    const atualizar = service.atualizarTodasCotacoes as (onProgress: (completed: number, total: number, ticker: string) => void) => ReturnType<AcaoService['atualizarTodasCotacoes']>;
    const result = firstValueFrom(atualizar.call(service, progress));
    httpTesting.expectOne(`${apiBaseUrl}/acoes`).flush([acao, { ...acao, id: 2, ticker: 'AAPL' }]);
    httpTesting.expectOne(`${apiBaseUrl}/acoes/1/atualizar-cotacao`).flush(acao);
    expect(progress).toHaveBeenCalledWith(1, 2, 'PETR4');
    httpTesting.expectOne(`${apiBaseUrl}/acoes/2/atualizar-cotacao`).flush({}, { status: 503, statusText: 'Service Unavailable' });
    expect(progress).toHaveBeenCalledWith(2, 2, 'AAPL');
    expect((await result).map(item => item.sucesso)).toEqual([true, false]);
  });

  it('atualiza todas em sequência e informa falhas parciais sem interromper as demais', async () => {
    const result = firstValueFrom(service.atualizarTodasCotacoes());
    httpTesting.expectOne(`${apiBaseUrl}/acoes`).flush([acao, { ...acao, id: 2, ticker: 'VALE3' }, { ...acao, id: 3, ticker: 'ITUB4' }]);
    const first = httpTesting.expectOne(`${apiBaseUrl}/acoes/1/atualizar-cotacao`);
    expect(first.request.method).toBe('PUT');
    httpTesting.expectNone(`${apiBaseUrl}/acoes/2/atualizar-cotacao`);
    first.flush({ ...acao, cotacaoAtual: 40 });
    httpTesting.expectOne(`${apiBaseUrl}/acoes/2/atualizar-cotacao`).flush({ detail: 'Provedor indisponível' }, { status: 502, statusText: 'Bad Gateway' });
    httpTesting.expectOne(`${apiBaseUrl}/acoes/3/atualizar-cotacao`).flush({ ...acao, id: 3 });
    const updates = await result;
    expect(updates.map(update => update.sucesso)).toEqual([true, false, true]);
    expect(updates[1].ticker).toBe('VALE3');
  });

  it('envia somente o contrato de cadastro para POST /acoes', async () => {
    const request: AcaoRequest = { ticker: 'PETR4', corretoraId: 2 };
    const resultPromise = firstValueFrom(service.salvar(request));

    const req = httpTesting.expectOne(`${apiBaseUrl}/acoes`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(request);
    expect(req.request.headers.has('Authorization')).toBeFalse();
    req.flush(acao);

    expect(await resultPromise).toEqual(acao);
  });

  it('lista ações com GET /acoes', async () => {
    const resultPromise = firstValueFrom(service.listar());

    const req = httpTesting.expectOne(`${apiBaseUrl}/acoes`);
    expect(req.request.method).toBe('GET');
    req.flush([acao]);

    expect(await resultPromise).toEqual([acao]);
  });

  it('busca ação por id com GET /acoes/{id}', async () => {
    const resultPromise = firstValueFrom(service.buscarPorId(1));

    const req = httpTesting.expectOne(`${apiBaseUrl}/acoes/1`);
    expect(req.request.method).toBe('GET');
    req.flush(acao);

    expect(await resultPromise).toEqual(acao);
  });

  it('codifica o ticker na busca por ticker', async () => {
    const resultPromise = firstValueFrom(service.buscarPorTicker('A/B'));

    const req = httpTesting.expectOne(`${apiBaseUrl}/acoes/ticker/A%2FB`);
    expect(req.request.method).toBe('GET');
    req.flush(acao);

    expect(await resultPromise).toEqual(acao);
  });

  it('atualiza cotação com PUT e corpo vazio', async () => {
    const resultPromise = firstValueFrom(service.atualizarCotacao(1));

    const req = httpTesting.expectOne(`${apiBaseUrl}/acoes/1/atualizar-cotacao`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({});
    req.flush(acao);

    expect(await resultPromise).toEqual(acao);
  });

  it('entrega ProblemDetail padronizado ao consumidor', () => {
    const problem: ProblemDetail = {
      status: 422,
      title: 'Dado externo não encontrado',
      detail: 'Ticker não encontrado'
    };
    let received: ApiError | undefined;

    service.buscarPorTicker('INVALID').subscribe({ error: error => received = error });
    httpTesting.expectOne(`${apiBaseUrl}/acoes/ticker/INVALID`).flush(problem, {
      status: 422,
      statusText: 'Unprocessable Content'
    });

    expect(received).toEqual(jasmine.any(ApiError));
    expect(received?.message).toBe('Ticker não encontrado');
  });
});
