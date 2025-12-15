import { Routes, CanActivate } from '@angular/router';
import { DashboardWebComponent } from './dashboard-web/dashboard-web.component';
import { AlertaNaoConformidadeComponent } from './alerta-naoconformidade/alerta-naoconformidade.component';
import { GraficoParametroComponent } from './grafico-parametros/grafico-parametro.component';
import { DashboardTvComponent } from './dashboard-tv/dashboard-tv.component';
import { ResultadoAnaliseComponent } from './resultado-analise/resultado-analise.component';
import { LoginComponent } from './acessos/login/login.component';
import { NovaSenhaComponent } from './acessos/nova-senha/nova-senha.component';
import { CadastroUsuarioComponent } from './acessos/cadastro-usuario/cadastro-usuario.component';

import { AcessoNegadoComponent } from './acesso-negado/acesso-negado.component';
import { GerenciamentoParametrosComponent } from './gerenciamento-parametros/gerenciamento-parametros.component';
import { RecuperarSenhaComponent } from './acessos/recuperar-senha/recuperar-senha.component';

import { authGuard } from './acessos/auth/auth.guard';
import { loginGuard } from './acessos/login/login.guard';

export const routes: Routes = [
  {
    path: 'dashboard-web',
    component: DashboardWebComponent,
    canActivate: [authGuard],
    title: 'Dashboard de Monitoramento',
  },
  {
    path: 'alertas',
    component: AlertaNaoConformidadeComponent,
    canActivate: [authGuard],
    data: { roles: ['Gestor'] },
    title: 'Gestão de Não Conformidades',
  },
  {
    path: 'grafico-parametros',
    component: GraficoParametroComponent,
    canActivate: [authGuard],
    title: 'Gráfico de Parâmetros',
  },
  {
    path: 'resultados-analise',
    component: ResultadoAnaliseComponent,
    canActivate: [authGuard],
    title: 'Gerenciamento de Resultados',
  },
  {
    path: 'dashboard-tv',
    component: DashboardTvComponent,
    canActivate: [authGuard],
    title: 'Dashboard TV',
  },
  {
    path: 'gerenciamento-parametros',
    component: GerenciamentoParametrosComponent,
    canActivate: [authGuard],
    title: 'Gerenciamento de Parâmetros',
  },

  //ACESSOS
  {
     path: 'login',
     component: LoginComponent,
     canActivate:[loginGuard],
      title: 'Login'
  },
  {
    path: 'cadastro-usuario',
    component: CadastroUsuarioComponent,
    canActivate: [authGuard],
    data: { roles: ['Gestor'] },
    title: 'Cadastro de Usuário',
  },
  {
    path: 'recuperar-senha',
    component: RecuperarSenhaComponent,
    title: 'Recuperar Senha',
  },
  { path: 'nova-senha', component: NovaSenhaComponent },
  { path: 'acesso-negado', component: AcessoNegadoComponent },
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: '**', redirectTo: 'login' },
];
