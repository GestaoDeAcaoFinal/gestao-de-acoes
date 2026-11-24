export type Papel = 'ADMIN' | 'USER';

export interface LoginRequest {
  username: string;
  password: string;
}

export interface TokenResponse {
  token: string;
  tipo: 'Bearer';
  expiresIn: number;
}

export interface AuthenticatedUser {
  username: string;
  roles: Papel[];
  expiresAt: number;
}

export interface UsuarioResponse {
  id: number;
  username: string;
  papel: Papel;
  ativo: boolean;
}

export interface UsuarioCreateRequest {
  username: string;
  password: string;
  papel: Papel;
}

export interface UsuarioUpdateRequest {
  username: string;
  papel: Papel;
  ativo: boolean;
}

export interface AlterarSenhaRequest {
  password: string;
}
