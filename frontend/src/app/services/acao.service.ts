import { Inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, concatMap, from, map, merge, Observable, of, retry, tap, throwError, timer, toArray } from 'rxjs';
import { ApiError } from '../core/api/api-error.interceptor';

import { API_BASE_URL } from '../core/api/api-base-url.token';
import { Acao, AcaoRequest } from '../core/api/api.models';

export interface AtualizacaoCotacao {
  ticker: string;
  sucesso: boolean;
  erro?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AcaoService {
  private readonly apiUrl: string;

  constructor(
    private readonly http: HttpClient,
    @Inject(API_BASE_URL) apiBaseUrl: string
  ) {
    this.apiUrl = `${apiBaseUrl.replace(/\/$/, '')}/acoes`;
  }

  salvar(acao: AcaoRequest): Observable<Acao> {
    return this.http.post<Acao>(this.apiUrl, acao);
  }

  listar(): Observable<Acao[]> {
    return this.http.get<Acao[]>(this.apiUrl);
  }

  buscarPorId(id: number): Observable<Acao> {
    return this.http.get<Acao>(`${this.apiUrl}/${id}`);
  }

  buscarPorTicker(ticker: string): Observable<Acao> {
    return this.http.get<Acao>(`${this.apiUrl}/ticker/${encodeURIComponent(ticker)}`);
  }

  atualizarCotacao(id: number): Observable<Acao> {
    return this.http.put<Acao>(`${this.apiUrl}/${id}/atualizar-cotacao`, {});
  }

  atualizarTodasCotacoes(
    onProgress?: (completed: number, total: number, ticker: string) => void,
    onWait?: (seconds: number) => void
  ): Observable<AtualizacaoCotacao[]> {
    return this.listar().pipe(concatMap(acoes => {
      let concluidas = 0;
      onProgress?.(0, acoes.length, '');
      const itens = acoes.map((acao, index) => ({ acao, index }));
      // Uma chamada por provedor, sem bloquear Brapi durante a espera internacional.
      const filas = [false, true].map(internacional => from(
        itens.filter(item => (item.acao.mercado === 'EUA') === internacional)
      ).pipe(concatMap(({ acao, index }) => this.atualizarCotacao(acao.id).pipe(
        retry({ count: 2, delay: (erro: ApiError) => {
          if (erro.status === 503 && erro.code === 'AGUARDANDO_COTA' && erro.retryAfterSeconds) {
            onWait?.(erro.retryAfterSeconds);
            return timer(erro.retryAfterSeconds * 1000);
          }
          return throwError(() => erro);
        } }),
        map(() => ({ index, resultado: { ticker: acao.ticker, sucesso: true } as AtualizacaoCotacao })),
        catchError((erro: ApiError) => erro.status === 401 || erro.status === 403
          ? throwError(() => erro)
          : of({ index, resultado: { ticker: acao.ticker, sucesso: false, erro: erro.message } as AtualizacaoCotacao }))
      ))));
      return merge(...filas).pipe(
        tap(item => onProgress?.(++concluidas, acoes.length, item.resultado.ticker)),
        toArray(),
        map(resultados => resultados.sort((a, b) => a.index - b.index).map(item => item.resultado))
      );
    }));
  }
}
