import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { UsuarioService } from '../../services/usuario.service';
import { UsuariosComponent } from './usuarios.component';

describe('UsuariosComponent', () => {
  const user = { id: 1, username: 'operador', papel: 'USER' as const, ativo: true, cpf: '52998224725', telefone: '11999999999' };
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
  it('não desvia o foco se o usuário começa a preencher outro campo antes da renderização', async () => {
    const telefone: HTMLInputElement = fixture.nativeElement.querySelector('#usuario-telefone');
    component.editar(user);
    telefone.focus();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(document.activeElement).toBe(telefone);
  });
  it('exige completar os dados de uma conta antiga antes de editar', () => {
    component.editar({ ...user, cpf: null, telefone: null });
    component.salvar();
    expect(service.atualizar).not.toHaveBeenCalled();
    expect(component.form.controls.cpf.touched).toBeTrue();
    expect(component.form.controls.telefone.touched).toBeTrue();
    component.form.patchValue({ cpf: '529.982.247-25', telefone: '(11) 99999-9999' });
    component.salvar();
    expect(service.atualizar).toHaveBeenCalledWith(1, {
      username: 'operador', cpf: '52998224725', telefone: '11999999999', papel: 'USER', ativo: true
    });
  });
  it('rejeita CPF inválido e exibe erro sem enviar cadastro', () => {
    component.form.patchValue({ username: 'novo', cpf: '11111111111', telefone: '11999999999', password: 'senha-ficticia' });
    component.salvar(); fixture.detectChanges();
    expect(service.cadastrar).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('#usuario-cpf').getAttribute('aria-invalid')).toBe('true');
    expect(fixture.nativeElement.querySelector('#usuario-cpf-error').textContent).toContain('CPF válido');
    expect(fixture.nativeElement.querySelector('#usuario-telefone').type).toBe('tel');
  });
  it('normaliza o cadastro e impede envio duplicado enquanto aguarda resposta', () => {
    const resposta = new Subject<typeof user>();
    service.cadastrar.and.returnValue(resposta);
    component.form.patchValue({ username: 'novo', cpf: '529.982.247-25', telefone: '(11) 99999-9999', password: 'senha-ficticia' });
    component.salvar(); component.salvar();
    expect(service.cadastrar).toHaveBeenCalledTimes(1);
    expect(service.cadastrar).toHaveBeenCalledWith({
      username: 'novo', cpf: '52998224725', telefone: '11999999999', password: 'senha-ficticia', papel: 'USER'
    });
    resposta.error(new Error('CPF já cadastrado em outra conta'));
    expect(component.saving).toBeFalse();
    expect(component.error).toBe('CPF já cadastrado em outra conta');
    expect(component.form.controls.cpf.value).toBe('529.982.247-25');
  });
  it('bloqueia cadastro sem senha e aceita edição sem enviar senha', () => {
    component.form.patchValue({ username: 'novo' }); component.salvar();
    expect(service.cadastrar).not.toHaveBeenCalled();
    component.editar(user); component.form.patchValue({ ativo: false }); component.salvar();
    expect(service.atualizar).toHaveBeenCalledWith(1, { username: 'operador', cpf: '52998224725', telefone: '11999999999', papel: 'USER', ativo: false });
  });
  it('cadastra e limpa a senha após sucesso', () => {
    component.form.patchValue({ username: 'novo', cpf: '52998224725', telefone: '11999999999', password: 'senha-ficticia' }); component.salvar();
    expect(service.cadastrar).toHaveBeenCalledWith({ username: 'novo', cpf: '52998224725', telefone: '11999999999', password: 'senha-ficticia', papel: 'USER' });
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
