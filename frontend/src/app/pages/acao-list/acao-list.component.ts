import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Observable } from 'rxjs';
import { ApiError } from '../../core/api/api-error.interceptor';
import { TICKER_PATTERN } from '../../core/api/ticker-format';
import { Acao } from '../../core/api/api.models';
import { initialRequestState, RequestState, toErrorState, toLoadingState, toSuccessState } from '../../core/state/request-state';
import { AcaoService } from '../../services/acao.service';
import { AuthService } from '../../core/auth/auth.service';
import { AtualizarCotacoesComponent } from './atualizar-cotacoes.component';
import { LucideAngularModule, Search, ChevronDown, RefreshCw, Plus } from 'lucide-angular';

type SearchCriterion = 'id' | 'ticker';
@Component({ selector: 'app-acao-list', imports: [CurrencyPipe, DatePipe, ReactiveFormsModule, RouterLink, AtualizarCotacoesComponent, LucideAngularModule], templateUrl: './acao-list.component.html', styleUrl: './acao-list.component.css' })
export class AcaoListComponent implements OnInit {
  readonly icons = { Search, ChevronDown, RefreshCw, Plus };
  readonly auth = inject(AuthService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly acaoService = inject(AcaoService);
  readonly searchForm = this.formBuilder.nonNullable.group({ criterio: this.formBuilder.nonNullable.control<SearchCriterion>('id'), valor: ['', Validators.required] });
  readonly filtroForm = this.formBuilder.nonNullable.group({ texto: '', mercado: '' });
  readonly detalhesAbertos = new Set<number>();
  listState: RequestState<Acao[]> = initialRequestState<Acao[]>();
  searchState: RequestState<Acao> = initialRequestState<Acao>();
  readonly updating = new Set<number>();
  readonly updateErrors: Record<number, ApiError> = {};
  get mercadosDisponiveis(): string[] { return [...new Set((this.listState.data ?? []).map(acao => acao.mercado).filter((mercado): mercado is string => !!mercado))].sort(); }
  get acoesFiltradas(): Acao[] {
    const { texto, mercado } = this.filtroForm.getRawValue();
    const pesquisa = texto.trim().toLocaleLowerCase('pt-BR');
    return (this.listState.data ?? []).filter(acao => (!mercado || acao.mercado === mercado) && (!pesquisa || `${acao.ticker} ${acao.nomeEmpresa ?? ''}`.toLocaleLowerCase('pt-BR').includes(pesquisa)));
  }
  alternarDetalhes(id: number): void { if (this.detalhesAbertos.has(id)) this.detalhesAbertos.delete(id); else this.detalhesAbertos.add(id); }
  ngOnInit(): void { this.carregarAcoes(); }
  carregarAcoes(): void {
    this.listState = toLoadingState(this.listState);
    this.acaoService.listar().subscribe({ next: data => this.listState = toSuccessState(this.listState, data), error: (e: ApiError) => this.listState = toErrorState(this.listState, e) });
  }
  buscar(): void {
    const criterio = this.searchForm.controls.criterio.value; const valor = this.searchForm.controls.valor.value.trim(); this.searchForm.controls.valor.setErrors(null);
    if (!valor) { this.invalidSearch({ required: true }); return; }
    let request$: Observable<Acao>;
    if (criterio === 'id') { if (!/^[1-9]\d*$/.test(valor)) { this.invalidSearch({ positiveInteger: true }); return; } request$ = this.acaoService.buscarPorId(Number(valor)); }
    else { if (!TICKER_PATTERN.test(valor)) { this.invalidSearch({ ticker: true }); return; } request$ = this.acaoService.buscarPorTicker(valor.toUpperCase()); }
    this.searchState = toLoadingState(this.searchState);
    request$.subscribe({ next: data => this.searchState = toSuccessState(this.searchState, data), error: (e: ApiError) => this.searchState = toErrorState(this.searchState, e) });
  }
  atualizarCotacao(acao: Acao): void {
    if (this.updating.has(acao.id)) return;
    this.updating.add(acao.id); delete this.updateErrors[acao.id];
    this.acaoService.atualizarCotacao(acao.id).subscribe({
      next: atualizada => { this.replaceVisible(atualizada); this.updating.delete(acao.id); },
      error: (e: ApiError) => { this.updateErrors[acao.id] = e; this.updating.delete(acao.id); }
    });
  }
  private replaceVisible(updated: Acao): void {
    if (this.listState.data) this.listState.data = this.listState.data.map(a => a.id === updated.id ? updated : a);
    if (this.searchState.data?.id === updated.id) this.searchState.data = updated;
  }
  private invalidSearch(errors: object): void { this.searchForm.controls.valor.setErrors(errors); this.searchForm.controls.valor.markAsTouched(); }
}
