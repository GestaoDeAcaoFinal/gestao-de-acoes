import { HttpClient } from '@angular/common/http';
import { computed, Inject, Injectable, OnDestroy, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';

import { API_BASE_URL } from '../api/api-base-url.token';
import { AuthenticatedUser, LoginRequest, Papel, TokenResponse } from './auth.models';
import { ApiError } from '../api/api-error.interceptor';

const TOKEN_KEY = 'gestao-acao.auth-token';

@Injectable({ providedIn: 'root' })
export class AuthService implements OnDestroy {
  private expiryTimer: ReturnType<typeof setTimeout> | undefined;
  private readonly tokenState = signal<string | null>(null);
  private readonly userState = signal<AuthenticatedUser | null>(null);

  readonly token = this.tokenState.asReadonly();
  readonly user = this.userState.asReadonly();
  readonly username = computed(() => this.userState()?.username ?? null);
  readonly isAuthenticated = computed(() => this.userState() !== null);

  constructor(
    @Inject(API_BASE_URL) private readonly apiBaseUrl: string,
    private readonly http: HttpClient
  ) {
    this.restoreSession();
  }

  login(credentials: LoginRequest): Observable<TokenResponse> {
    const url = `${this.apiBaseUrl.replace(/\/$/, '')}/api/auth/login`;
    return this.http.post<TokenResponse>(url, credentials).pipe(
      tap(response => {
        if (response?.tipo !== 'Bearer' || !Number.isFinite(response.expiresIn) || response.expiresIn <= 0
          || typeof response.token !== 'string' || !this.setToken(response.token)) {
          this.logout();
          throw new ApiError(502, 'Resposta de login inválida', 'Não foi possível iniciar a sessão. Tente entrar novamente.');
        }
      })
    );
  }

  logout(): void {
    this.clearExpiryTimer();
    sessionStorage.removeItem(TOKEN_KEY);
    this.tokenState.set(null);
    this.userState.set(null);
  }

  restoreSession(): void {
    const token = sessionStorage.getItem(TOKEN_KEY);
    if (!token) {
      this.logout();
      return;
    }
    this.setToken(token);
  }

  hasRole(role: Papel): boolean {
    return this.userState()?.roles.includes(role) ?? false;
  }

  ngOnDestroy(): void {
    this.clearExpiryTimer();
  }

  private clearExpiryTimer(): void {
    if (this.expiryTimer !== undefined) clearTimeout(this.expiryTimer);
    this.expiryTimer = undefined;
  }

  private scheduleExpiry(expiresAt: number): void {
    this.clearExpiryTimer();
    const remaining = expiresAt - Date.now();
    if (remaining <= 0) { this.logout(); return; }
    this.expiryTimer = setTimeout(() => this.scheduleExpiry(expiresAt), Math.min(remaining, 2147483647));
  }

  private setToken(token: string): boolean {
    const user = decodeUser(token);
    if (!user || user.expiresAt <= Date.now()) {
      this.logout();
      return false;
    }
    sessionStorage.setItem(TOKEN_KEY, token);
    this.tokenState.set(token);
    this.userState.set(user);
    this.scheduleExpiry(user.expiresAt);
    return true;
  }
}

function decodeUser(token: string): AuthenticatedUser | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3 || parts.some(part => !/^[A-Za-z0-9_-]+$/.test(part))) return null;
    const payload = JSON.parse(decodeBase64Url(token.split('.')[1])) as {
      sub?: unknown;
      authorities?: unknown;
      exp?: unknown;
    };
    if (typeof payload.sub !== 'string' || !payload.sub.trim() || typeof payload.exp !== 'number'
      || !Number.isFinite(payload.exp * 1000) || !Array.isArray(payload.authorities)) {
      return null;
    }
    const roles = payload.authorities
      .filter((authority): authority is string => typeof authority === 'string')
      .filter(authority => authority === 'ROLE_ADMIN' || authority === 'ROLE_USER')
      .map(authority => authority.slice(5))
      .filter((role): role is Papel => role === 'ADMIN' || role === 'USER');
    return roles.length ? { username: payload.sub, roles, expiresAt: payload.exp * 1000 } : null;
  } catch {
    return null;
  }
}

function decodeBase64Url(value: string | undefined): string {
  if (!value) throw new Error('JWT sem payload');
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  return decodeURIComponent(Array.from(atob(normalized), char =>
    `%${char.charCodeAt(0).toString(16).padStart(2, '0')}`).join(''));
}
