import { HttpClient } from '@angular/common/http';
import { Inject, Injectable } from '@angular/core';
import { API_BASE_URL } from '../core/api/api-base-url.token';
import { UsuarioCreateRequest, UsuarioResponse, UsuarioUpdateRequest } from '../core/auth/auth.models';

@Injectable({ providedIn: 'root' })
export class UsuarioService {
  private readonly url: string;
  constructor(private readonly http: HttpClient, @Inject(API_BASE_URL) base: string) {
    this.url = `${base.replace(/\/$/, '')}/api/usuarios`;
  }
  listar() { return this.http.get<UsuarioResponse[]>(this.url); }
  cadastrar(request: UsuarioCreateRequest) { return this.http.post<UsuarioResponse>(this.url, request); }
  atualizar(id: number, request: UsuarioUpdateRequest) { return this.http.put<UsuarioResponse>(`${this.url}/${id}`, request); }
  alterarSenha(id: number, password: string) { return this.http.put<void>(`${this.url}/${id}/senha`, { password }); }
}
