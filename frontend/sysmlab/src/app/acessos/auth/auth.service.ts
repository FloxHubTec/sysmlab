import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { getSupabaseClient } from './supabase.client';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private supabase = getSupabaseClient();

  private sessionCache: any = null;
  private loadingSession: Promise<any> | null = null;

  private authState = new BehaviorSubject<boolean>(false);
  public isLoggedIn$ = this.authState.asObservable();

  constructor() {
    // mantém cache sempre atualizado
    this.supabase.auth.onAuthStateChange((_event, session) => {
      this.sessionCache = session;
      this.authState.next(!!session);
    });
  }

  // ---------------------- SESSÃO ----------------------

  /**
   * 🔒 ÚNICA forma correta de buscar sessão no Supabase
   * Evita NavigatorLockAcquireTimeoutError
   */
  async getSession(): Promise<any> {
    if (this.sessionCache) {
      return this.sessionCache;
    }

    if (!this.loadingSession) {
      this.loadingSession = this.supabase.auth
        .getSession()
        .then(({ data }) => {
          this.sessionCache = data.session;
          return data.session;
        })
        .catch(() => null)
        .finally(() => {
          this.loadingSession = null;
        });
    }

    return this.loadingSession;
  }

  /**
   * Usado APENAS depois que o guard já rodou
   */
  getSessionSync(): any {
    return this.sessionCache;
  }

  /**
   * Mantido por compatibilidade
   * (não chama Supabase de novo)
   */
  async loadInitialSessionBlocking() {
    return await this.getSession();
  }

  getAccessToken(): string | null {
    return this.sessionCache?.access_token ?? null;
  }

  // ---------------------- LOGIN ----------------------

  async login(email: string, senha: string) {
    const result = await this.supabase.auth.signInWithPassword({
      email,
      password: senha
    });

    if (result.data.session) {
      this.sessionCache = result.data.session;
    }

    return result;
  }

  // ---------------------- REGISTRO ----------------------

  async register(
    email: string,
    senha: string,
    perfil: string,
    nome: string,
    telefone: string
  ) {
    return await this.supabase.auth.signUp({
      email,
      password: senha,
      options: {
        data: { perfil, nome, telefone }
      }
    });
  }

  // ---------------------- LOGOUT ----------------------

  async logout() {
    await this.supabase.auth.signOut();
    this.sessionCache = null;
  }

  // ---------------------- RESET DE SENHA ----------------------

  async requestPasswordReset(email: string) {
    return await this.supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'http://localhost:4200/nova-senha'
    });
  }

  // ---------------------- SET SESSION (RESET SENHA) ----------------------

  async setSessionFromToken(accessToken: string, refreshToken: string) {
    const { data, error } = await this.supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken
    });

    if (error) throw error;

    this.sessionCache = data.session;
    return data.session;
  }

  // ---------------------- UPDATE PASSWORD ----------------------

  async updatePassword(newPassword: string) {
    const { data, error } = await this.supabase.auth.updateUser({
      password: newPassword
    });

    if (error) throw error;
    return data;
  }
}
