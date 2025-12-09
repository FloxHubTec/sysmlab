import { RecuperarSenhaComponent } from './acessos/recuperar-senha/recuperar-senha.component';
import { Routes, CanActivate } from '@angular/router';

// === IMPORTAÇÃO DOS COMPONENTES ===
import { DashboardWebComponent } from './dashboard-web/dashboard-web.component'; // <--- NOVO
import { AlertaNaoConformidadeComponent } from './alerta-naoconformidade/alerta-naoconformidade.component';
import { GraficoParametroComponent } from './grafico-parametros/grafico-parametro.component';
import { DashboardTvComponent } from './dashboard-tv/dashboard-tv.component';
import { ResultadoAnaliseComponent } from './resultado-analise/resultado-analise.component';
import { LoginComponent } from './acessos/login/login.component';
import { NovaSenhaComponent } from './acessos/nova-senha/nova-senha.component';
import { AuthGuard } from './acessos/auth/auth.guard';
import { CadastroUsuarioComponent } from './acessos/cadastro-usuario/cadastro-usuario.component';
import { RoleGuard } from './acessos/auth/role.guard';
import { GerenciamentoParametrosComponent } from './gerenciamento-parametros/gerenciamento-parametros.component';

export const routes: Routes = [
  // 1. Rota do Dashboard Web (NOVA PRINCIPAL)
  {
    path: 'dashboard-web',
    component: DashboardWebComponent,
    title: 'Dashboard de Monitoramento'
  },

  // 2. Rota de Alertas
  {
    path: 'alertas',
    component: AlertaNaoConformidadeComponent,
    title: 'Gestão de Não Conformidades'
  },

  // 3. Rota do Gráfico Simples
  {
    path: 'grafico-parametros', // Ajustei o nome para ficar mais claro, antes era 'dashboard'
    component: GraficoParametroComponent,
    title: 'Gráfico de Parâmetros'
  },

  // 4. Rota de Gerenciamento (Tabela CRUD)
  {
    path: 'resultados-analise',
    component: ResultadoAnaliseComponent,
    title: 'Gerenciamento de Resultados'
  },

  // 5. Rota TV
  {
    path: 'dashboard-tv',
    component: DashboardTvComponent,
    canActivate: [AuthGuard],
    title: 'Dashboard TV',
  },
  {
    path: 'login',
    component: LoginComponent,
    title: 'Login',
  },
  {
    path: 'cadastro-usuario',
    component: CadastroUsuarioComponent,
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['Gestor'] },
    title: 'Cadastro de Usuário',
  },
  {
    path: 'recuperar-senha',
    component: RecuperarSenhaComponent,
    title: 'Recuperar Senha',
  },
  {
    path: 'nova-senha',
    component: NovaSenhaComponent,
  },
  {
    path: 'gerenciamento-parametros',
    component: GerenciamentoParametrosComponent,
    canActivate: [AuthGuard],
    title: 'Gerenciamento de Parâmetros',
  },

  // === REDIRECIONAMENTOS (RAIZ) ===

  // 6. Rota Default (Vazio) -> Vai para Dashboard Web
  {
    path: '',
    redirectTo: '/resultados-analise', // ← AGORA É A ROTA PRINCIPAL
    pathMatch: 'full'
  },

  // 7. Rota Coringa (404) -> Vai para Dashboard Web
  {
    path: '**',
    redirectTo: '/resultados-analise' // ← REDIRECIONA PARA RESULTADOS-ANÁLISE
  }
];
