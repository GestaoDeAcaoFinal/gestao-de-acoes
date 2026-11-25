import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { AcaoService, AtualizacaoCotacao } from '../../services/acao.service';
import { AtualizarCotacoesComponent } from './atualizar-cotacoes.component';

describe('AtualizarCotacoesComponent', () => {
  it('informa a espera local e mantém o botão bloqueado até a conclusão', () => {
    const request = new Subject<AtualizacaoCotacao[]>();
    let wait: ((seconds: number) => void) | undefined;
    const service = { atualizarTodasCotacoes: (_progress: unknown, callback: (seconds: number) => void) => {
      wait = callback; return request;
    } };
    TestBed.configureTestingModule({ imports: [AtualizarCotacoesComponent], providers: [
      { provide: AuthService, useValue: { hasRole: () => true } }, { provide: AcaoService, useValue: service }
    ] });
    const fixture = TestBed.createComponent(AtualizarCotacoesComponent);
    fixture.componentInstance.atualizar(); wait?.(61); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="status"]').textContent).toContain('61 segundos');
    expect(fixture.nativeElement.querySelector('button').disabled).toBeTrue();
    request.next([]); request.complete(); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('button').disabled).toBeFalse();
  });
  it('mostra progresso e mantém bloqueio até o fim do lote sem recarga antecipada', () => {
    const request = new Subject<AtualizacaoCotacao[]>();
    let notify: ((completed: number, total: number, ticker: string) => void) | undefined;
    const service = jasmine.createSpyObj('AcaoService', ['atualizarTodasCotacoes']);
    service.atualizarTodasCotacoes.and.callFake((progress?: typeof notify) => { notify = progress; return request; });
    TestBed.configureTestingModule({ imports: [AtualizarCotacoesComponent], providers: [
      { provide: AuthService, useValue: { hasRole: () => true } }, { provide: AcaoService, useValue: service }
    ] });
    const fixture = TestBed.createComponent(AtualizarCotacoesComponent);
    const component = fixture.componentInstance;
    const emit = spyOn(component.atualizadas, 'emit');
    component.atualizar();
    expect(notify).toBeDefined(); notify?.(1, 10, 'AAPL'); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="status"]')?.textContent).toContain('1 de 10');
    expect(fixture.nativeElement.textContent).toContain('limite');
    expect(fixture.nativeElement.querySelector('button').disabled).toBeTrue();
    expect(emit).not.toHaveBeenCalled();
    request.next([{ ticker: 'AAPL', sucesso: true }]); request.complete(); fixture.detectChanges();
    expect(component.atualizando).toBeFalse(); expect(emit).toHaveBeenCalledTimes(1);
  });
  it('bloqueia clique duplicado e informa falhas parciais antes de recarregar os dados', () => {
    const request = new Subject<AtualizacaoCotacao[]>();
    const service = jasmine.createSpyObj('AcaoService', ['atualizarTodasCotacoes']);
    service.atualizarTodasCotacoes.and.returnValue(request);
    TestBed.configureTestingModule({ imports: [AtualizarCotacoesComponent], providers: [
      { provide: AuthService, useValue: { hasRole: () => true } },
      { provide: AcaoService, useValue: service }
    ] });
    const fixture = TestBed.createComponent(AtualizarCotacoesComponent);
    const component = fixture.componentInstance;
    const emit = spyOn(component.atualizadas, 'emit');
    component.atualizar(); component.atualizar(); fixture.detectChanges();
    expect(service.atualizarTodasCotacoes).toHaveBeenCalledTimes(1);
    expect(fixture.nativeElement.querySelector('button').disabled).toBeTrue();
    request.next([{ ticker: 'PETR4', sucesso: true }, { ticker: 'MGLU3', sucesso: false, erro: 'Provedor indisponível' }]);
    request.complete(); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="status"]').textContent).toContain('1 de 2');
    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain('MGLU3');
    expect(emit).toHaveBeenCalledTimes(1);
    expect(component.atualizando).toBeFalse();
  });
});
