import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { AuthResponse, LoginPayload, RegisterPayload, Usuario } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private readonly baseUrl = 'http://localhost:3000';
  private readonly TOKEN_KEY = 'sysmlab_token';
  private readonly USER_KEY = 'sysmlab_user';

  private supabase: SupabaseClient;

  constructor(private http: HttpClient) {
    this.supabase = createClient(
      'https://exxufmvzgnbjmaexzmuz.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV4eHVmbXZ6Z25iam1hZXh6bXV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3NDgzMTgsImV4cCI6MjA3NzMyNDMxOH0.R1lsXHhItc4LMLXSSUNYyfl4rt9J1RmLcgVHt1MgeUA'
    );
  }

  // ----------------------------
  // AUTENTICAÇÃO VIA BACKEND
  // ----------------------------

  login(payload: LoginPayload): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.baseUrl}/login`, payload);
  }

  register(payload: RegisterPayload): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.baseUrl}/cadastro-usuario`, payload);
  }

  saveSession(response: AuthResponse): void {
    localStorage.setItem(this.TOKEN_KEY, response.token);
    localStorage.setItem(this.USER_KEY, JSON.stringify(response.usuario));
  }

  logout(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
  }

  isAuthenticated(): boolean {
    return !!localStorage.getItem(this.TOKEN_KEY);
  }

  // ----------------------------
  // PEGAR USUÁRIO LOGADO
  // ----------------------------

  getCurrentUser(): Usuario | null {
    const stored = localStorage.getItem(this.USER_KEY);
    return stored ? JSON.parse(stored) as Usuario : null;
  }

  // ----------------------------
  // SUPABASE – RESET DE SENHA
  // ----------------------------

  async requestPasswordReset(email: string) {
    return await this.supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'http://localhost:4200/nova-senha'
    });
  }

  async updatePassword(novaSenha: string) {
    return await this.supabase.auth.updateUser({
      password: novaSenha
    });
  }
}
