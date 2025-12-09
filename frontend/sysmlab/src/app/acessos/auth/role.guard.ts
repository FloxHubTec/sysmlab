import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class RoleGuard implements CanActivate {

  constructor(
    private auth: AuthService,
    private router: Router
  ) {}

  canActivate(route: any): boolean {
    const rolesNecessarios = route.data['roles'] as Array<string>;

    // Usuário logado salvo no localStorage
    const user = this.auth.getCurrentUser();

    if (user && user.perfil && rolesNecessarios.includes(user.perfil)) {
      return true;
    }

    this.router.navigate(['/acesso-negado']);
    return false;
  }
}
