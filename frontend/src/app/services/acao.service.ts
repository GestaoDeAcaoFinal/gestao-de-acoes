import { Inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, concatMap, from, map, Observable, of, tap, throwError, toArray } from 'rxjs';
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

  atualizarTodasCotacoes(onProgress?: (completed: number, total: number, ticker: string) => void): Observable<AtualizacaoCotacao[]> {
    return this.listar().pipe(concatMap(acoes => {
      let concluidas = 0;
      onProgress?.(0, acoes.length, '');
      return from(acoes).pipe(
      concatMap(acao => this.atualizarCotacao(acao.id).pipe(
        map(() => ({ ticker: acao.ticker, sucesso: true })),
        catchError((erro: ApiError) => erro.status === 401 || erro.status === 403
          ? throwError(() => erro)
          : of({ ticker: acao.ticker, sucesso: false, erro: erro.message }))
      )),
      tap(resultado => onProgress?.(++concluidas, acoes.length, resultado.ticker)),
      toArray()
    );
    }));
  }
}
