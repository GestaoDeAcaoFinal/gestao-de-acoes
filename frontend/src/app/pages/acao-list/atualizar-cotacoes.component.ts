import { Component, DestroyRef, EventEmitter, inject, Input, Output } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { AcaoService } from '../../services/acao.service';

@Component({
  selector: 'app-atualizar-cotacoes',
  template: `
    @if (auth.hasRole('ADMIN')) {
      <button type="button" class="btn-finance-secondary" [disabled]="atualizando || bloqueado" [attr.aria-busy]="atualizando" (click)="atualizar()">
        {{ atualizando ? 'Atualizando cotações…' : 'Atualizar todas as cotações' }}
      </button>
      @if (mensagem) { <p class="quote-feedback" role="status" aria-live="polite">{{ mensagem }}</p> }
      @if (erro) { <p class="quote-feedback text-danger" role="alert">{{ erro }}</p> }
    }
  `,
  styles: [':host{display:block;min-width:0;max-width:100%}.quote-feedback{font-size:.8125rem;margin:.75rem 0 0;max-width:28rem;overflow-wrap:anywhere;color:var(--color-muted)}@media(max-width:480px){button{width:100%}}']
})
export class AtualizarCotacoesComponent {
  readonly auth = inject(AuthService);
  private readonly acoes = inject(AcaoService);
  private readonly destroyRef = inject(DestroyRef);
  @Input() bloqueado = false;
  @Output() readonly atualizadas = new EventEmitter<void>();
  atualizando = false;
  mensagem = '';
  erro = '';

  atualizar(): void {
    if (this.atualizando || this.bloqueado || !this.auth.hasRole('ADMIN')) return;
    this.atualizando = true;
    this.mensagem = 'Preparando atualização. As consultas internacionais respeitam o limite do provedor e podem levar cerca de um minuto.';
    this.erro = '';
    this.acoes.atualizarTodasCotacoes((completed, total, ticker) => {
      this.mensagem = `${completed} de ${total} ações processadas${ticker ? ' · ' + ticker : ''}. As consultas internacionais respeitam o limite do provedor; aguarde.`;
    }).pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.atualizando = false)).subscribe({
      next: resultados => {
        const falhas = resultados.filter(resultado => !resultado.sucesso);
        this.mensagem = resultados.length === 0 ? 'Nenhuma ação cadastrada para atualizar.'
          : `${resultados.length - falhas.length} de ${resultados.length} cotações atualizadas.`;
        this.erro = falhas.map(falha => `${falha.ticker}: ${falha.erro}`).join('; ');
        this.atualizadas.emit();
      },
      error: erro => { this.erro = erro.message; }
    });
  }
}
