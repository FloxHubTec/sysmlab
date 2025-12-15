import { Routes } from '@angular/router';

// === IMPORTAÇÃO DOS COMPONENTES ===
import { DashboardWebComponent } from './dashboard-web/dashboard-web.component'; // <--- NOVO
import { AlertaNaoConformidadeComponent } from './alerta-naoconformidade/alerta-naoconformidade.component';
import { GraficoParametroComponent } from './grafico-parametros/grafico-parametro.component';
import { DashboardTvComponent } from './dashboard-tv/dashboard-tv.component';
import { ResultadoAnaliseComponent } from './resultado-analise/resultado-analise.component';
import { LoginComponent } from './login/login.component';

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
    title: 'Dashboard TV'
  },

  // === REDIRECIONAMENTOS (RAIZ) ===

  // 6. Rota Default (Vazio) -> Vai para Dashboard Web
  {
    path: "login",
    component: LoginComponent,
    title: "Login"
  },
  {
    path: '',
    redirectTo: '/dashboard-web',
    pathMatch: 'full'
  },

  // 7. Rota Coringa (404) -> Vai para Dashboard Web
  {
    path: '**',
    redirectTo: '/dashboard-web'
  }
];
