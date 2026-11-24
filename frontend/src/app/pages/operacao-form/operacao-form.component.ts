import { CurrencyPipe, DatePipe } from '@angular/common';
import { afterNextRender, Component, DestroyRef, ElementRef, inject, Injector, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { LucideAngularModule, ArrowRight, ArrowLeft } from 'lucide-angular';
import { Observable } from 'rxjs';
import { ApiError } from '../../core/api/api-error.interceptor';
import { Acao, OperacaoAcao, TipoOperacao } from '../../core/api/api.models';
import { initialRequestState, RequestState, toErrorState, toLoadingState, toSuccessState } from '../../core/state/request-state';
import { AcaoService } from '../../services/acao.service';
import { OperacaoService } from '../../services/operacao.service';

interface RevisaoOperacao {
  readonly acaoId: number;
  readonly ticker: string;
  readonly empresa: string;
  readonly moeda: string;
  readonly tipo: TipoOperacao;
  readonly quantidade: number;
  readonly preco: number;
  readonly total: number;
}

@Component({ selector: 'app-operacao-form', imports: [CurrencyPipe, DatePipe, ReactiveFormsModule, RouterLink, LucideAngularModule], templateUrl: './operacao-form.component.html', styleUrl: './operacao-form.component.css' })
export class OperacaoFormComponent implements OnInit {
  readonly icons = { ArrowRight, ArrowLeft };
  private readonly formBuilder = inject(FormBuilder);
  private readonly operacaoService = inject(OperacaoService);
  private readonly acaoService = inject(AcaoService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly injector = inject(Injector);
  private readonly host: ElementRef<HTMLElement> = inject(ElementRef);
  readonly form = this.formBuilder.group({
    acaoId: this.formBuilder.nonNullable.control(0, [Validators.required, Validators.min(1)]),
    quantidade: this.formBuilder.nonNullable.control(0, [Validators.required, Validators.min(1), Validators.pattern(/^\d+$/)]),
    tipoOperacao: this.formBuilder.nonNullable.control<TipoOperacao>('COMPRA'),
    precoCompra: this.formBuilder.control<number | null>(null),
    precoVenda: this.formBuilder.control<number | null>(null)
  });
  state: RequestState<OperacaoAcao> = initialRequestState<OperacaoAcao>();
  acoesState: RequestState<Acao[]> = initialRequestState<Acao[]>();
  revisao: RevisaoOperacao | null = null;
  resultadoIncerto = false;
  @ViewChild('reviewHeading') set reviewHeading(element: ElementRef<HTMLElement> | undefined) { element?.nativeElement.focus(); }

  get acaoSelecionada(): Acao | null { return this.acoesState.data?.find(acao => acao.id === this.form.controls.acaoId.value) ?? null; }
  get moedaSelecionada(): string { return this.acaoSelecionada?.moeda || 'BRL'; }
  get etapa(): number { return this.state.data ? 3 : this.revisao ? 2 : 1; }
  get resumo(): RevisaoOperacao | null {
    if (this.revisao) return this.revisao;
    const acao = this.acaoSelecionada;
    if (!acao) return null;
    const values = this.form.getRawValue();
    const preco = (values.tipoOperacao === 'COMPRA' ? values.precoCompra : values.precoVenda) ?? 0;
    const total = preco * values.quantidade;
    return { acaoId: acao.id, ticker: acao.ticker, empresa: acao.nomeEmpresa || 'Empresa não informada', moeda: acao.moeda || 'BRL', tipo: values.tipoOperacao, quantidade: values.quantidade, preco, total: Number.isFinite(total) && total > 0 ? total : 0 };
  }

  ngOnInit(): void {
    this.carregarAcoes();
    this.form.controls.tipoOperacao.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.updatePriceValidation());
    this.form.controls.acaoId.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(acaoId => this.preencherPrecoCompra(acaoId));
    this.updatePriceValidation();
  }
  carregarAcoes(): void {
    this.acoesState = toLoadingState(this.acoesState);
    this.acaoService.listar().subscribe({ next: data => { this.acoesState = toSuccessState(this.acoesState, data); this.preencherPrecoCompra(this.form.controls.acaoId.value); }, error: (e: ApiError) => this.acoesState = toErrorState(this.acoesState, e) });
  }

  /** First submit only freezes the values shown on the review screen. */
  salvar(): void {
    if (this.state.loading || this.state.data || this.revisao || this.acoesState.loading) return;
    this.updatePriceValidation();
    const resumo = this.resumo;
    if (!resumo) this.form.controls.acaoId.setErrors({ unavailable: true });
    if (!Number.isSafeInteger(this.form.controls.quantidade.value)) this.form.controls.quantidade.setErrors({ integer: true });
    if (this.form.invalid || !resumo) { this.form.markAllAsTouched(); return; }
    if (!Number.isFinite(resumo.preco) || resumo.preco <= 0 || !Number.isFinite(resumo.preco * resumo.quantidade)) {
      this.form.controls[resumo.tipo === 'COMPRA' ? 'precoCompra' : 'precoVenda'].setErrors({ money: true }); this.form.markAllAsTouched(); return;
    }
    this.state = initialRequestState<OperacaoAcao>();
    this.resultadoIncerto = false;
    this.revisao = Object.freeze({ ...resumo });
    this.form.disable({ emitEvent: false });
  }

  confirmar(): void {
    if (!this.revisao || this.state.loading || this.state.data || this.state.error || this.resultadoIncerto) return;
    const values = this.revisao;
    this.state = toLoadingState(this.state);
    const request$: Observable<OperacaoAcao> = values.tipo === 'COMPRA'
      ? this.operacaoService.comprar(values.acaoId, values.quantidade, values.preco)
      : this.operacaoService.vender(values.acaoId, values.quantidade, values.preco);
    request$.subscribe({
      next: data => { this.state = toSuccessState(this.state, data, `${values.tipo === 'COMPRA' ? 'Compra' : 'Venda'} realizada com sucesso.`); this.focarElemento('#operacao-registrada'); },
      error: (e: ApiError) => { this.resultadoIncerto = e.status === 0 || e.status >= 500; this.state = toErrorState(this.state, e); }
    });
  }

  editar(): void {
    if (this.state.loading || this.state.data) return;
    this.revisao = null; this.resultadoIncerto = false; this.state = initialRequestState<OperacaoAcao>(); this.form.enable({ emitEvent: false });
    this.focarElemento('#acao');
  }
  novaOperacao(): void {
    if (this.state.loading) return;
    this.revisao = null; this.resultadoIncerto = false; this.state = initialRequestState<OperacaoAcao>();
    this.form.enable({ emitEvent: false });
    this.form.reset({ acaoId: 0, quantidade: 0, tipoOperacao: 'COMPRA', precoCompra: null, precoVenda: null });
    this.updatePriceValidation();
    this.focarElemento('#acao');
  }
  private focarElemento(selector: string): void {
    afterNextRender({ write: () => this.host.nativeElement.querySelector<HTMLElement>(selector)?.focus() }, { injector: this.injector });
  }
  private updatePriceValidation(): void {
    const validators = [Validators.required, Validators.min(.01)];
    const compra = this.form.controls.precoCompra, venda = this.form.controls.precoVenda;
    compra.setValidators(this.form.controls.tipoOperacao.value === 'COMPRA' ? validators : []);
    venda.setValidators(this.form.controls.tipoOperacao.value === 'VENDA' ? validators : []);
    compra.updateValueAndValidity({ emitEvent: false }); venda.updateValueAndValidity({ emitEvent: false });
  }
  private preencherPrecoCompra(acaoId: number): void {
    if (this.revisao) return;
    const acao = this.acoesState.data?.find(item => item.id === acaoId);
    this.form.controls.precoCompra.setValue(acao?.cotacaoAtual ?? null, { emitEvent: false });
  }
}
