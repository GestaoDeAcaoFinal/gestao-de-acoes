import { registerLocaleData } from '@angular/common';
import localePt from '@angular/common/locales/pt';
import { LOCALE_ID } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, Subject } from 'rxjs';

import { ApiError } from '../../core/api/api-error.interceptor';
import { ResumoCarteira } from '../../core/api/api.models';
import { OperacaoService } from '../../services/operacao.service';
import { CarteiraComponent } from './carteira.component';
import { AuthService } from '../../core/auth/auth.service';
import { AcaoService } from '../../services/acao.service';

registerLocaleData(localePt, 'pt-BR');

const resumo: ResumoCarteira = {
  posicoes: [
    { acaoId: 7, ticker: 'AAPL', quantidadeAtual: 2, precoMedio: 525, custoTotal: 1050, cotacaoAtual: 550, valorAtual: 1100 }
  ],
  quantidadeTotal: 2,
  precoMedioCarteira: 525,
  custoTotalCarteira: 1050,
  valorAtualCarteira: 1100
};

describe('CarteiraComponent', () => {
  let component: CarteiraComponent;
  let fixture: ComponentFixture<CarteiraComponent>;
  let service: jasmine.SpyObj<OperacaoService>;

  beforeEach(async () => {
    service = jasmine.createSpyObj<OperacaoService>('OperacaoService', ['resumirCarteira']);
    service.resumirCarteira.and.returnValue(of(resumo));
    await TestBed.configureTestingModule({
      imports: [CarteiraComponent],
      providers: [
        { provide: AuthService, useValue: { hasRole: () => false } },
        { provide: AcaoService, useValue: {} },
        provideRouter([]),
        { provide: LOCALE_ID, useValue: 'pt-BR' },
        { provide: OperacaoService, useValue: service }
      ]
    }).compileComponents();
    fixture = TestBed.createComponent(CarteiraComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('carrega e apresenta a carteira consolidada em BRL', () => {
    expect(service.resumirCarteira).toHaveBeenCalledTimes(1);
    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('[data-testid="valor-atual"]')?.textContent).toContain('1.100,00');
    expect(host.querySelector('[data-testid="resultado"]')?.textContent).toContain('50,00');
    expect(host.querySelector('[data-testid="numero-posicoes"]')?.textContent).toContain('1');
    expect(host.querySelector('[data-testid="posicao-AAPL"]')?.textContent).toContain('AAPL');
    expect(host.textContent).toContain('convertidos para BRL pela cotação atual');
  });

  it('formats every monetary metric and the four monetary columns of an international position in BRL', () => {
    const host = fixture.nativeElement as HTMLElement;
    const text = (element: Element | null) => element?.textContent?.replace(/\s+/g, ' ').trim();
    const monetaryMetrics = [
      ['valor-atual', 'R$ 1.100,00'],
      ['custo-total', 'R$ 1.050,00'],
      ['resultado', 'R$ 50,00']
    ];

    for (const [testId, expected] of monetaryMetrics) {
      expect(text(host.querySelector(`[data-testid="${testId}"]`))).toBe(expected);
    }

    const cells = Array.from(host.querySelectorAll('[data-testid="posicao-AAPL"] td.numeric'));
    expect(cells).toHaveSize(5);
    expect(cells.slice(1).map(cell => text(cell))).toEqual([
      'R$ 525,00',
      'R$ 1.050,00',
      'R$ 550,00',
      'R$ 1.100,00'
    ]);
  });

  it('mantém valores monetários longos legíveis no resumo desktop e móvel', () => {
    const host = fixture.nativeElement as HTMLElement;
    const mediaRule = Array.from(document.styleSheets).flatMap(sheet => Array.from(sheet.cssRules))
      .filter((rule): rule is CSSMediaRule => rule instanceof CSSMediaRule)
      .find(rule => rule.conditionText === '(max-width: 760px)' && Array.from(rule.cssRules).some(child => child instanceof CSSStyleRule && child.selectorText.includes('.portfolio-metrics')));
    expect(mediaRule).toBeDefined(); if (!mediaRule) return;
    const originalMedia = mediaRule.media.mediaText;
    const metrics = host.querySelector<HTMLElement>('.portfolio-metrics')!;
    const result = host.querySelector<HTMLElement>('[data-testid="resultado"]')!;
    const width = metrics.style.width, content = result.textContent;
    try {
      mediaRule.media.mediaText = 'not all';
      metrics.style.width = '1180px'; result.textContent = '-R$ 9.999.999.999,99';
      expect(getComputedStyle(metrics).gridTemplateColumns.trim().split(' ')).toHaveSize(3);
      expect(result.scrollWidth).toBeLessThanOrEqual(result.clientWidth);
      mediaRule.media.mediaText = 'all'; metrics.style.width = '288px';
      expect(getComputedStyle(metrics).gridTemplateColumns.trim().split(' ')).toHaveSize(2);
      expect(result.scrollWidth).toBeLessThanOrEqual(result.clientWidth);
    } finally { mediaRule.media.mediaText = originalMedia; metrics.style.width = width; result.textContent = content; }
  });
  it('expõe carregamento, erro com retry e estado vazio', () => {
    const pending = new Subject<ResumoCarteira>();
    service.resumirCarteira.and.returnValue(pending);
    component.carregarCarteira();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="status"]')).not.toBeNull();

    pending.error(new ApiError(503, 'Indisponível', 'Carteira indisponível.'));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="alert"]')?.textContent)
      .toContain('Carteira indisponível.');

    service.resumirCarteira.and.returnValue(of({ ...resumo, posicoes: [], quantidadeTotal: 0 }));
    (fixture.nativeElement.querySelector('[data-testid="carteira-retry"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Nenhuma ação em posse');
  });

  it('mantém a seção da carteira nomeada por um título existente no estado vazio', () => {
    service.resumirCarteira.and.returnValue(of({ ...resumo, posicoes: [], quantidadeTotal: 0 }));
    component.carregarCarteira();
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    const section = host.querySelector<HTMLElement>('section[aria-labelledby]');
    const labelId = section?.getAttribute('aria-labelledby');
    const label = labelId ? host.querySelector(`#${labelId}`) : null;

    expect(section).not.toBeNull();
    expect(label).not.toBeNull();
    expect(label?.textContent?.trim()).toBe('Carteira consolidada');
  });
});
