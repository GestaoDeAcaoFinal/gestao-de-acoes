import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal, Type } from '@angular/core';
import { provideRouter, Router } from '@angular/router';
import { of, Subject } from 'rxjs';
import { AppComponent } from './app.component';
import { AuthService } from './core/auth/auth.service';
import { ApiError } from './core/api/api-error.interceptor';
import { Acao, Corretora, OperacaoAcao } from './core/api/api.models';
import { OperacaoFormComponent } from './pages/operacao-form/operacao-form.component';
import { AcaoListComponent } from './pages/acao-list/acao-list.component';
import { UsuariosComponent } from './pages/usuarios/usuarios.component';
import { UsuarioService } from './services/usuario.service';
import { AcaoService } from './services/acao.service';
import { OperacaoService } from './services/operacao.service';

const broker = { id: 1, razaoSocial: 'Corretora teste', cnpj: '12345678000190' } as Corretora;
const stock: Acao = { id: 1, ticker: 'PETR4', nomeEmpresa: 'Petrobras', moeda: 'BRL', mercado: 'B3', cotacaoAtual: 35, dataHoraCotacao: null, corretoraRelacionada: broker };
const trade = { id: 1, acao: stock, quantidade: 2, precoUnitario: 35, valorTotal: 70, tipoOperacao: 'COMPRA', dataOperacao: '2026-11-13T12:00:00' } as OperacaoAcao;

describe('Redesign — fluxos preservados', () => {
  let auth: { isAuthenticated: ReturnType<typeof signal<boolean>>; username: ReturnType<typeof signal<string | null>>; hasRole: jasmine.Spy; logout: jasmine.Spy };
  let trades: jasmine.SpyObj<OperacaoService>;
  let stocks: jasmine.SpyObj<AcaoService>;
  beforeEach(() => {
    auth = { isAuthenticated: signal(true), username: signal<string | null>('admin'), hasRole: jasmine.createSpy().and.returnValue(true), logout: jasmine.createSpy() };
    trades = jasmine.createSpyObj('OperacaoService', ['comprar', 'vender', 'listar', 'resumirCarteira']);
    trades.comprar.and.returnValue(of(trade));
    stocks = jasmine.createSpyObj('AcaoService', ['listar', 'atualizarTodasCotacoes']);
    stocks.listar.and.returnValue(of([stock, { ...stock, id: 2, ticker: 'AAPL', nomeEmpresa: 'Apple', mercado: 'EUA', moeda: 'USD' }]));
    stocks.atualizarTodasCotacoes.and.returnValue(of([]));
    TestBed.configureTestingModule({ providers: [provideRouter([]), { provide: AuthService, useValue: auth }, { provide: OperacaoService, useValue: trades }, { provide: AcaoService, useValue: stocks }, { provide: UsuarioService, useValue: { listar: () => of([]) } }] });
    spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
  });
  function create<T>(type: Type<T>): ComponentFixture<T> {
    const fixture = TestBed.createComponent(type); fixture.detectChanges(); return fixture;
  }
  function click<T>(fixture: ComponentFixture<T>, selector: string) {
    fixture.detectChanges();
    const button = fixture.nativeElement.querySelector(selector) as HTMLButtonElement | null;
    expect(button).withContext(selector).not.toBeNull(); button?.click(); fixture.detectChanges();
  }
  function fill(fixture: ComponentFixture<OperacaoFormComponent>) {
    fixture.componentInstance.form.setValue({ acaoId: 1, quantidade: 2, tipoOperacao: 'COMPRA', precoCompra: 35, precoVenda: null });
  }
  it('abre administração somente no menu ADMIN e fecha com Escape', () => {
    const fixture = create(AppComponent);
    expect(fixture.nativeElement.querySelector('.primary-nav a[href="/usuarios"]')).toBeNull();
    click(fixture, '[data-testid="account-menu-trigger"]');
    expect(fixture.nativeElement.querySelector('.account-menu a[href="/usuarios"]')).not.toBeNull();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.account-menu')).toBeNull();
  });
  it('oferece saída mas não administração no menu USER', () => {
    auth.hasRole.and.returnValue(false);
    const fixture = create(AppComponent); click(fixture, '[data-testid="account-menu-trigger"]');
    expect(fixture.nativeElement.querySelector('a[href="/usuarios"]')).toBeNull();
    click(fixture, '[data-testid="logout"]'); expect(auth.logout).toHaveBeenCalledTimes(1);
  });
  it('revisa antes do POST, envia snapshot e bloqueia cliques repetidos até depois do sucesso', () => {
    const pending = new Subject<OperacaoAcao>(); trades.comprar.and.returnValue(pending);
    const fixture = create(OperacaoFormComponent); fill(fixture); fixture.componentInstance.salvar();
    expect(trades.comprar).not.toHaveBeenCalled();
    fixture.componentInstance.form.controls.quantidade.setValue(99);
    click(fixture, '[data-testid="confirmar-operacao"]'); click(fixture, '[data-testid="confirmar-operacao"]');
    expect(trades.comprar).toHaveBeenCalledOnceWith(1, 2, 35);
    pending.next(trade); fixture.detectChanges(); fixture.componentInstance.salvar();
    expect(trades.comprar).toHaveBeenCalledTimes(1);
  });
  it('voltar para edição invalida a revisão e calcula novo total antes de confirmar', () => {
    const fixture = create(OperacaoFormComponent); fill(fixture); fixture.componentInstance.salvar();
    expect(trades.comprar).not.toHaveBeenCalled();
    click(fixture, '[data-testid="editar-operacao"]');
    fixture.componentInstance.form.controls.quantidade.setValue(3); fixture.componentInstance.salvar();
    fixture.detectChanges(); expect(fixture.nativeElement.querySelector('[data-testid="review-total"]')?.textContent).toContain('105');
    click(fixture, '[data-testid="confirmar-operacao"]'); expect(trades.comprar).toHaveBeenCalledOnceWith(1, 3, 35);
  });
  it('não reenvia automaticamente quando não consegue confirmar o resultado da requisição', () => {
    const pending = new Subject<OperacaoAcao>(); trades.comprar.and.returnValue(pending);
    const fixture = create(OperacaoFormComponent); fill(fixture); fixture.componentInstance.salvar();
    click(fixture, '[data-testid="confirmar-operacao"]'); pending.error(new ApiError(0, 'Conexão', 'Falha de rede')); fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('histórico');
    click(fixture, '[data-testid="confirmar-operacao"]'); expect(trades.comprar).toHaveBeenCalledTimes(1);
  });
  it('filtra o catálogo carregado por empresa e preserva os detalhes sem nova consulta HTTP', () => {
    const fixture = create(AcaoListComponent);
    const input = fixture.nativeElement.querySelector('[data-testid="stock-filter"]') as HTMLInputElement | null;
    expect(input).not.toBeNull(); if (!input) return;
    input.value = 'apple'; input.dispatchEvent(new Event('input')); fixture.detectChanges();
    const rows = fixture.nativeElement.querySelectorAll('tbody tr.stock-row');
    expect(rows.length).toBe(1); expect(rows[0]?.textContent).toContain('AAPL');
    click(fixture, '[data-testid="stock-detail-2"]');
    expect(fixture.nativeElement.querySelector('#stock-details-2')?.textContent).toContain('USD');
    expect(stocks.listar).toHaveBeenCalledTimes(1);
  });
  it('preserva preço digitado com três casas e multiplica antes de arredondar a apresentação', () => {
    const fixture = create(OperacaoFormComponent); fill(fixture);
    fixture.componentInstance.form.patchValue({ quantidade: 100, precoCompra: 35.125 });
    fixture.componentInstance.salvar(); fixture.detectChanges();
    const review = fixture.nativeElement.querySelector('.operation-review');
    expect(review).not.toBeNull();
    expect(review?.textContent).toMatch(/35[,.]125/);
    expect(fixture.nativeElement.querySelector('[data-testid="review-total"]')?.textContent.replace(/\D/g, '')).toBe('351250');
    click(fixture, '[data-testid="confirmar-operacao"]');
    expect(trades.comprar).toHaveBeenCalledOnceWith(1, 100, 35.125);
  });
  it('preserva a precisão de uma cotação sugerida automaticamente', () => {
    stocks.listar.and.returnValue(of([{ ...stock, cotacaoAtual: 35.125 }]));
    const fixture = create(OperacaoFormComponent);
    fixture.componentInstance.form.controls.acaoId.setValue(1);
    fixture.componentInstance.form.controls.quantidade.setValue(100);
    fixture.componentInstance.salvar(); click(fixture, '[data-testid="confirmar-operacao"]');
    expect(trades.comprar).toHaveBeenCalledOnceWith(1, 100, 35.125);
  });
  it('restaura foco ao voltar para o formulário e ao abrir os editores de acesso', async () => {
    const fixture = create(OperacaoFormComponent); fill(fixture); fixture.componentInstance.salvar(); fixture.detectChanges();
    fixture.componentInstance.editar(); fixture.detectChanges(); await fixture.whenStable();
    expect(document.activeElement).toBe(fixture.nativeElement.querySelector('#acao'));
    const users = create(UsuariosComponent);
    const user = { id: 1, username: 'operador', papel: 'USER' as const, ativo: true, cpf: null, telefone: null };
    users.componentInstance.editar(user); users.detectChanges(); await users.whenStable();
    expect(document.activeElement).toBe(users.nativeElement.querySelector('#usuario-nome'));
    users.componentInstance.prepararSenha(user); users.detectChanges(); await users.whenStable();
    expect(document.activeElement).toBe(users.nativeElement.querySelector('#nova-senha'));
  });
});
