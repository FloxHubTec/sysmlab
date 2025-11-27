// src/app/app.routes.ts
import { Routes } from '@angular/router';
import { DashboardTvComponent } from './dashboard-tv/dashboard-tv.component';
import { ResultadoAnaliseComponent } from './resultado-analise/resultado-analise.component';
import { LoginComponent } from './login/login.component';

export const routes: Routes = [
  {
    path: 'resultados-analise',
    component: ResultadoAnaliseComponent,
    title: 'Resultados de Análise'
  },
  {
    path: 'dashboard-tv',
    component: DashboardTvComponent,
    title: 'Dashboard TV'
  },
  {
    path: "login",
    component: LoginComponent,
    title: "Login"
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
