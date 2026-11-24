import { CurrencyPipe, DatePipe, formatDate } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Observable } from 'rxjs';

import { ApiError } from '../../core/api/api-error.interceptor';
import { Acao, OperacaoAcao } from '../../core/api/api.models';
import {
  initialRequestState,
  RequestState,
  toErrorState,
  toLoadingState,
  toSuccessState
} from '../../core/state/request-state';
import { AcaoService } from '../../services/acao.service';
import { OperacaoService } from '../../services/operacao.service';

type OperationFilter = 'todas' | 'compras' | 'vendas' | 'historico';

@Component({
  selector: 'app-operacao-list',
  imports: [CurrencyPipe, DatePipe, ReactiveFormsModule, RouterLink],
  templateUrl: './operacao-list.component.html',
  styleUrl: './operacao-list.component.css'
})
export class OperacaoListComponent implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly operacaoService = inject(OperacaoService);
  private readonly acaoService = inject(AcaoService);

  readonly historicoForm = this.formBuilder.nonNullable.group({
    acaoId: this.formBuilder.nonNullable.control(0, [Validators.required, Validators.min(1)])
  });
  readonly idForm = this.formBuilder.nonNullable.group({
    id: this.formBuilder.nonNullable.control(0, [Validators.required, Validators.min(1)])
  });
  readonly filtrosForm = this.formBuilder.nonNullable.group({
    texto: [''], inicio: [''], fim: ['']
  }, { validators: control => {
    const { inicio, fim } = control.value;
    return inicio && fim && inicio > fim ? { periodoInvertido: true } : null;
  } });
  readonly detalhesAbertos = new Set<number>();
  private historicoConsultadoId = 0;

  get operacoesFiltradas(): OperacaoAcao[] {
    if (this.filtrosForm.invalid) return [];
    const { texto, inicio, fim } = this.filtrosForm.getRawValue();
    const pesquisa = texto.trim().toLocaleLowerCase('pt-BR');
    return (this.listState.data ?? []).filter(op => {
      const corresponde = !pesquisa || `${op.id} ${op.acao.ticker} ${op.acao.nomeEmpresa ?? ''}`.toLocaleLowerCase('pt-BR').includes(pesquisa);
      if (!corresponde || (!inicio && !fim)) return corresponde;
      if (!op.dataOperacao || Number.isNaN(new Date(op.dataOperacao).getTime())) return false;
      const dia = formatDate(op.dataOperacao, 'yyyy-MM-dd', 'pt-BR');
      return (!inicio || dia >= inicio) && (!fim || dia <= fim);
    });
  }

  get contextoHistorico(): string {
    if (this.filtroAtivo === 'historico') {
      const acao = this.acoesState.data?.find(item => item.id === this.historicoConsultadoId);
      return `Histórico de ${acao?.ticker ?? 'ação ' + this.historicoConsultadoId}`;
    }
    return { todas: 'Todas as operações', compras: 'Compras', vendas: 'Vendas' }[this.filtroAtivo];
  }

  alternarDetalhes(id: number): void {
    if (this.detalhesAbertos.has(id)) this.detalhesAbertos.delete(id);
    else this.detalhesAbertos.add(id);
  }

  limparFiltros(): void {
    this.filtrosForm.reset(); this.historicoForm.reset();
    this.historicoConsultadoId = 0; this.aplicarFiltro('todas');
  }

  filtroAtivo: OperationFilter = 'todas';
  listState: RequestState<OperacaoAcao[]> = initialRequestState<OperacaoAcao[]>();
  detailState: RequestState<OperacaoAcao> = initialRequestState<OperacaoAcao>();
  acoesState: RequestState<Acao[]> = initialRequestState<Acao[]>();
  private listRequestGeneration = 0;

  ngOnInit(): void {
    this.carregarAcoes();
    this.carregar();
  }

  carregar(): void {
    if (this.filtroAtivo === 'historico') {
      this.loadList(this.operacaoService.listarHistorico(this.historicoConsultadoId));
      return;
    }

    this.loadList(this.requestFor(this.filtroAtivo));
  }

  aplicarFiltro(filtro: Exclude<OperationFilter, 'historico'>): void {
    this.filtroAtivo = filtro;
    this.loadList(this.requestFor(filtro));
  }

  buscarHistorico(): void {
    if (this.historicoForm.invalid) {
      this.historicoForm.markAllAsTouched();
      return;
    }

    this.filtroAtivo = 'historico';
    this.historicoConsultadoId = this.historicoForm.getRawValue().acaoId;
    this.loadList(this.operacaoService.listarHistorico(this.historicoConsultadoId));
  }

  buscarPorId(): void {
    if (this.detailState.loading) return;
    if (this.idForm.invalid) {
      this.idForm.markAllAsTouched();
      return;
    }

    this.detailState = toLoadingState(this.detailState);
    this.operacaoService.buscarPorId(this.idForm.getRawValue().id).subscribe({
      next: data => this.detailState = toSuccessState(this.detailState, data),
      error: (error: ApiError) => this.detailState = toErrorState(this.detailState, error)
    });
  }

  carregarAcoes(): void {
    this.acoesState = toLoadingState(this.acoesState);
    this.acaoService.listar().subscribe({
      next: data => this.acoesState = toSuccessState(this.acoesState, data),
      error: (error: ApiError) => this.acoesState = toErrorState(this.acoesState, error)
    });
  }

  private requestFor(filtro: Exclude<OperationFilter, 'historico'>): Observable<OperacaoAcao[]> {
    switch (filtro) {
      case 'compras': return this.operacaoService.listarCompras();
      case 'vendas': return this.operacaoService.listarVendas();
      default: return this.operacaoService.listar();
    }
  }

  private loadList(request$: Observable<OperacaoAcao[]>): void {
    const requestGeneration = ++this.listRequestGeneration;
    this.listState = toLoadingState(this.listState);
    request$.subscribe({
      next: data => {
        if (requestGeneration === this.listRequestGeneration) {
          this.listState = toSuccessState(this.listState, data);
        }
      },
      error: (error: ApiError) => {
        if (requestGeneration === this.listRequestGeneration) {
          this.listState = toErrorState(this.listState, error);
        }
      }
    });
  }
}
