import { RecuperarSenhaComponent } from './recuperar-senha/recuperar-senha.component';
// src/app/app.routes.ts
import { Routes } from '@angular/router';
import { DashboardTvComponent } from './dashboard-tv/dashboard-tv.component';
import { ResultadoAnaliseComponent } from './resultado-analise/resultado-analise.component';
import { LoginComponent } from './login/login.component';
import { AuthGuard } from './auth/auth.guard';
import { NovaSenhaComponent } from './nova-senha/nova-senha.component';

export const routes: Routes = [
  {
    path: 'resultados-analise',
    component: ResultadoAnaliseComponent,
    canActivate:[AuthGuard],
    title: 'Resultados de Análise'
  },
  {
    path: 'dashboard-tv',
    component: DashboardTvComponent,
    canActivate:[AuthGuard],
    title: 'Dashboard TV'
  },
  {
    path: "login",
    component: LoginComponent,
    title: "Login"
  },
  {
    path: "recuperar-senha",
    component: RecuperarSenhaComponent,
    title: "Recuperar Senha"
  },
  {
  path: 'nova-senha',
  component: NovaSenhaComponent
},
 {
    path: '',
    redirectTo: '/resultados-analise', // ← AGORA É A ROTA PRINCIPAL
    pathMatch: 'full'
  },
  {
    path: '**',
    redirectTo: '/resultados-analise' // ← REDIRECIONA PARA RESULTADOS-ANÁLISE
  }
];
