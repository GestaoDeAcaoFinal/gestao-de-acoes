import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { UsuarioService } from '../../services/usuario.service';
import { UsuariosComponent } from './usuarios.component';

describe('UsuariosComponent', () => {
  const user = { id: 1, username: 'operador', papel: 'USER' as const, ativo: true };
  let service: jasmine.SpyObj<UsuarioService>;
  let component: UsuariosComponent;
  let fixture: ComponentFixture<UsuariosComponent>;
  beforeEach(() => {
    service = jasmine.createSpyObj('UsuarioService', ['listar', 'cadastrar', 'atualizar', 'alterarSenha']);
    service.listar.and.returnValue(of([user]));
    service.cadastrar.and.returnValue(of(user));
    service.atualizar.and.returnValue(of(user));
    service.alterarSenha.and.returnValue(of(undefined));
    TestBed.configureTestingModule({ imports: [UsuariosComponent], providers: [{ provide: UsuarioService, useValue: service }] });
    fixture = TestBed.createComponent(UsuariosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });
  it('bloqueia cadastro sem senha e aceita edição sem enviar senha', () => {
    component.form.patchValue({ username: 'novo' }); component.salvar();
    expect(service.cadastrar).not.toHaveBeenCalled();
    component.editar(user); component.form.patchValue({ ativo: false }); component.salvar();
    expect(service.atualizar).toHaveBeenCalledWith(1, { username: 'operador', papel: 'USER', ativo: false });
  });
  it('cadastra e limpa a senha após sucesso', () => {
    component.form.patchValue({ username: 'novo', password: 'senha-ficticia' }); component.salvar();
    expect(service.cadastrar).toHaveBeenCalledWith({ username: 'novo', password: 'senha-ficticia', papel: 'USER' });
    expect(component.form.controls.password.value).toBe('');
  });
  it('altera senha pelo contrato dedicado e limpa o campo', () => {
    component.prepararSenha(user); component.senhaForm.setValue({ password: 'senha-ficticia' }); component.salvarSenha();
    expect(service.alterarSenha).toHaveBeenCalledWith(1, 'senha-ficticia');
    expect(component.senhaUsuario).toBeNull();
    expect(component.senhaForm.controls.password.value).toBe('');
  });
  it('identifica a conta selecionada e oculta cadastro durante a troca de senha', () => {
    component.prepararSenha(user);
    fixture.detectChanges();
    const panel: HTMLElement | null = fixture.nativeElement.querySelector('[data-testid="senha-destinatario"]');
    expect(panel?.textContent).toContain('operador');
    expect(panel?.textContent).toContain('USER');
    expect(panel?.textContent).toContain('Ativo');
    expect(panel?.textContent).toContain('1');
    expect(fixture.nativeElement.querySelector('#usuario-nome')).toBeNull();
  });
  it('limpa erro de listagem após tentar novamente com sucesso', () => {
    service.listar.and.returnValues(throwError(() => new Error('Falha temporária')), of([user]));
    component.carregar(); expect(component.error).toBe('Falha temporária');
    component.carregar(); expect(component.error).toBe('');
    expect(component.usuarios).toEqual([user]);
  });
  it('não envia username composto apenas por espaços', () => {
    component.form.patchValue({ username: '   ', password: 'senha-ficticia' });
    component.salvar();
    expect(service.cadastrar).not.toHaveBeenCalled();
  });
});
