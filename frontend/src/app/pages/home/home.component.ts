import { CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AtualizarCotacoesComponent } from '../acao-list/atualizar-cotacoes.component';

import { ApiError } from '../../core/api/api-error.interceptor';
import { OperacaoAcao, PosicaoCarteira, ResumoCarteira } from '../../core/api/api.models';
import {
  initialRequestState,
  RequestState,
  toErrorState,
  toLoadingState,
  toSuccessState
} from '../../core/state/request-state';
import { OperacaoService } from '../../services/operacao.service';

@Component({
  selector: 'app-home',
  imports: [CurrencyPipe, DatePipe, DecimalPipe, RouterLink, AtualizarCotacoesComponent],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css', './home-dashboard.css', './home-allocation.css']
})
export class HomeComponent implements OnInit {
  private readonly operacaoService = inject(OperacaoService);

  carteiraState: RequestState<ResumoCarteira> = initialRequestState<ResumoCarteira>();
  operacoesState: RequestState<OperacaoAcao[]> = initialRequestState<OperacaoAcao[]>();
  selectedAllocationId: number | null = null;
  private readonly allocationColors = ['#253d37', '#728679', '#b69a68', '#8a9c9b', '#6b7972', '#8b7360', '#566c72', '#8c886d'];
  private allocationPointer: number | null = null;

  ngOnInit(): void {
    this.carregarDashboard();
  }

  carregarDashboard(): void {
    this.carregarCarteira();
    this.carregarOperacoes();
  }

  get resultadoCarteira(): number {
    const carteira = this.carteiraState.data;
    return carteira ? carteira.valorAtualCarteira - carteira.custoTotalCarteira : 0;
  }

  get posicoesDistribuicao(): PosicaoCarteira[] {
    return [...(this.carteiraState.data?.posicoes ?? [])]
      .sort((first, second) => second.valorAtual - first.valorAtual || first.ticker.localeCompare(second.ticker));
  }

  get selectedAllocation(): PosicaoCarteira | null {
    const positions = this.posicoesDistribuicao;
    return positions.find(position => position.acaoId === this.selectedAllocationId) ?? positions[0] ?? null;
  }

  selecionarAtivo(id: number): void {
    this.selectedAllocationId = id;
  }

  iniciarSelecao(event: PointerEvent): void {
    if (!event.isPrimary || event.button !== 0) return;
    this.allocationPointer = event.pointerId;
    this.selecionarPeloPonteiro(event);
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  }
  moverSelecao(event: PointerEvent): void {
    if (event.pointerId === this.allocationPointer) this.selecionarPeloPonteiro(event);
  }
  finalizarSelecao(event: PointerEvent): void {
    if (event.pointerId !== this.allocationPointer) return;
    this.allocationPointer = null;
    const bar = event.currentTarget as HTMLElement;
    if (bar.hasPointerCapture(event.pointerId)) bar.releasePointerCapture(event.pointerId);
  }
  private selecionarPeloPonteiro(event: PointerEvent): void {
    const segments = [...(event.currentTarget as HTMLElement).querySelectorAll<HTMLElement>('[data-asset-id]')];
    const segment = segments.find(element => event.clientX <= element.getBoundingClientRect().right) ?? segments.at(-1);
    if (segment) this.selecionarAtivo(Number(segment.dataset['assetId']));
  }

  allocationColor(posicao: PosicaoCarteira): string {
    return this.allocationColors[Math.abs(posicao.acaoId - 1) % this.allocationColors.length];
  }

  allocationWidth(posicao: PosicaoCarteira): number {
    const total = this.carteiraState.data?.valorAtualCarteira ?? 0;
    const share = total > 0 ? posicao.valorAtual / total * 100 : 0;
    return Number.isFinite(share) ? Math.max(0, Math.min(100, share)) : 0;
  }

  get operacoesRecentes(): OperacaoAcao[] {
    return [...(this.operacoesState.data ?? [])]
      .sort((first, second) => new Date(second.dataOperacao).getTime() - new Date(first.dataOperacao).getTime())
      .slice(0, 5);
  }

  allocationPercent(posicao: PosicaoCarteira): number {
    return Math.round(this.allocationWidth(posicao) * 100) / 100;
  }

  private carregarCarteira(): void {
    this.carteiraState = toLoadingState(this.carteiraState);
    this.operacaoService.resumirCarteira().subscribe({
      next: data => this.carteiraState = toSuccessState(this.carteiraState, data),
      error: (error: ApiError) => this.carteiraState = toErrorState(this.carteiraState, error)
    });
  }

  private carregarOperacoes(): void {
    this.operacoesState = toLoadingState(this.operacoesState);
    this.operacaoService.listar().subscribe({
      next: data => this.operacoesState = toSuccessState(this.operacoesState, data),
      error: (error: ApiError) => this.operacoesState = toErrorState(this.operacoesState, error)
    });
  }
}
