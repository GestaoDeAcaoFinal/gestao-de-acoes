import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs';

import { ApiError } from '../../core/api/api-error.interceptor';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly form = this.formBuilder.nonNullable.group({
    username: ['', Validators.required],
    password: ['', Validators.required]
  });
  loading = false;
  errorMessage: string | null = null;

  login(): void {
    if (this.form.invalid || this.loading) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading = true;
    this.errorMessage = null;
    this.auth.login(this.form.getRawValue()).pipe(finalize(() => this.loading = false)).subscribe({
      next: () => {
        this.form.controls.password.reset();
        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') || '/';
        const destination = returnUrl.startsWith('/') && !returnUrl.startsWith('//')
          && !/^\/login(?:[/?#;]|$)/i.test(returnUrl) ? returnUrl : '/';
        void this.router.navigateByUrl(destination);
      },
      error: (error: ApiError) => {
        this.loading = false;
        this.errorMessage = error.status === 401
          ? 'Usuário ou senha inválidos.'
          : error.message;
      }
    });
  }
}
