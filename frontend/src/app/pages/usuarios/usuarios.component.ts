import { afterNextRender, Component, ElementRef, inject, Injector, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { UsuarioResponse, Papel } from '../../core/auth/auth.models';
import { UsuarioService } from '../../services/usuario.service';
import { cpfValidator, telefoneValidator } from '../../core/validation/usuario.validators';

@Component({
  selector: 'app-usuarios', imports: [ReactiveFormsModule],
  templateUrl: './usuarios.component.html', styleUrl: './usuarios.component.css'
})
export class UsuariosComponent implements OnInit {
  private readonly service = inject(UsuarioService);
  private readonly fb = inject(FormBuilder);
  private readonly injector = inject(Injector);
  private readonly host: ElementRef<HTMLElement> = inject(ElementRef);
  usuarios: UsuarioResponse[] = [];
  editingId: number | null = null;
  loading = false;
  saving = false;
  message = '';
  error = '';
  readonly form = this.fb.nonNullable.group({
    username: ['', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(100)]],
    cpf: ['', [Validators.required, cpfValidator]],
    telefone: ['', [Validators.required, telefoneValidator]],
    password: [''], papel: this.fb.nonNullable.control<Papel>('USER'), ativo: [true]
  });
  readonly senhaForm = this.fb.nonNullable.group({
    password: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(72)]]
  });
  senhaUsuario: UsuarioResponse | null = null;
  ngOnInit() { this.novo(false); this.carregar(); }
  carregar() {
    this.error = '';
    this.loading = true;
    this.service.listar().pipe(finalize(() => this.loading = false)).subscribe({
      next: users => this.usuarios = users,
      error: e => this.error = e.message
    });
  }
  novo(focar = true) {
    this.senhaUsuario = null;
    this.editingId = null;
    this.form.reset({ username: '', cpf: '', telefone: '', password: '', papel: 'USER', ativo: true });
    this.form.controls.password.setValidators([Validators.required, Validators.minLength(8), Validators.maxLength(72)]);
    this.form.controls.password.updateValueAndValidity();
    if (focar) this.focarCampo('#usuario-nome');
  }
  editar(user: UsuarioResponse) {
    this.senhaUsuario = null;
    this.editingId = user.id;
    this.form.reset({ username: user.username, cpf: user.cpf ?? '', telefone: user.telefone ?? '', password: '', papel: user.papel, ativo: user.ativo });
    this.form.controls.password.clearValidators();
    this.form.controls.password.updateValueAndValidity();
    this.focarCampo('#usuario-nome');
  }
  salvar() {
    if (this.form.invalid || this.saving) { this.form.markAllAsTouched(); return; }
    this.saving = true; this.error = ''; this.message = '';
    const valores = this.form.getRawValue();
    const { username, password, papel, ativo } = valores;
    const cpf = valores.cpf.replace(/\D/g, '');
    const telefone = valores.telefone.replace(/\D/g, '');
    const request = this.editingId === null
      ? this.service.cadastrar({ username, cpf, telefone, password, papel })
      : this.service.atualizar(this.editingId, { username, cpf, telefone, papel, ativo });
    request.pipe(finalize(() => this.saving = false)).subscribe({
      next: () => { this.message = 'Usuário salvo com sucesso.'; this.novo(false); this.carregar(); },
      error: e => this.error = e.message
    });
  }
  prepararSenha(user: UsuarioResponse) { this.senhaUsuario = user; this.senhaForm.reset(); this.focarCampo('#nova-senha'); }
  private focarCampo(selector: string): void {
    afterNextRender({ write: () => this.host.nativeElement.querySelector<HTMLElement>(selector)?.focus() }, { injector: this.injector });
  }
  salvarSenha() {
    if (!this.senhaUsuario || this.senhaForm.invalid || this.saving) { this.senhaForm.markAllAsTouched(); return; }
    this.saving = true; this.error = ''; this.message = '';
    this.service.alterarSenha(this.senhaUsuario.id, this.senhaForm.getRawValue().password)
      .pipe(finalize(() => this.saving = false)).subscribe({
        next: () => { this.senhaForm.reset(); this.senhaUsuario = null; this.message = 'Senha alterada com sucesso.'; },
        error: e => this.error = e.message
      });
  }
}
