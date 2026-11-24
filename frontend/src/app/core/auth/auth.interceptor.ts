import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

import { AuthService } from './auth.service';
import { API_BASE_URL } from '../api/api-base-url.token';
import { ApiError } from '../api/api-error.interceptor';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const base = inject(API_BASE_URL).replace(/\/$/, '');
  const isApi = request.url.startsWith(`${base}/`);
  if (isApi) auth.restoreSession();
  const token = auth.token();
  const isLogin = request.url.endsWith('/api/auth/login');
  const authenticatedRequest = isApi && token && !isLogin && !request.headers.has('Authorization')
    ? request.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : request;

  return next(authenticatedRequest).pipe(
    catchError((error: unknown) => {
      if (isApi && (error instanceof HttpErrorResponse || error instanceof ApiError) && error.status === 401 && !isLogin) {
        auth.logout();
        void router.navigate(['/login'], { queryParams: { returnUrl: router.url } });
      }
      return throwError(() => error);
    })
  );
};
