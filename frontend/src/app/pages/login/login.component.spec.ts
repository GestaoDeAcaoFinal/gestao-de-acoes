import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';

import { AuthService } from '../../core/auth/auth.service';
import { LoginComponent } from './login.component';

describe('LoginComponent', () => {
  let fixture: ComponentFixture<LoginComponent>;
  const auth = jasmine.createSpyObj<AuthService>('AuthService', ['login']);

  beforeEach(async () => {
    auth.login.calls.reset();
    auth.login.and.returnValue(of({ token: 'jwt', tipo: 'Bearer', expiresIn: 3600 }));
    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [provideRouter([]), { provide: AuthService, useValue: auth }]
    }).compileComponents();
    fixture = TestBed.createComponent(LoginComponent);
    fixture.detectChanges();
  });

  it('não envia credenciais enquanto o formulário é inválido', () => {
    fixture.componentInstance.login();
    expect(auth.login).not.toHaveBeenCalled();
  });

  it('envia username e password válidos', () => {
    fixture.componentInstance.form.setValue({ username: 'admin', password: 'segredo123' });
    fixture.componentInstance.login();
    expect(auth.login).toHaveBeenCalledOnceWith({ username: 'admin', password: 'segredo123' });
  });
  it('limpa senha e libera o formulário após sucesso', () => {
    spyOn(TestBed.inject(Router), 'navigateByUrl').and.resolveTo(true);
    fixture.componentInstance.form.setValue({ username: 'admin', password: 'senha-ficticia' });
    fixture.componentInstance.login();
    expect(fixture.componentInstance.form.controls.password.value).toBe('');
    expect(fixture.componentInstance.loading).toBeFalse();
  });
  it('evita voltar para o próprio login após autenticar', () => {
    spyOn(TestBed.inject(ActivatedRoute).snapshot.queryParamMap, 'get').and.returnValue('/login');
    const navigate = spyOn(TestBed.inject(Router), 'navigateByUrl').and.resolveTo(true);
    fixture.componentInstance.form.setValue({ username: 'admin', password: 'senha-ficticia' });
    fixture.componentInstance.login();
    expect(navigate).toHaveBeenCalledWith('/');
  });
});
