import { Routes } from '@angular/router';
import { DashboardTvComponent } from './dashboard-tv/dashboard-tv.component';


export const routes: Routes = [
  {
    path: 'tv',
    component: DashboardTvComponent,
    title: 'Dashboard TV'
  },
  { path: '', redirectTo: '/tv', pathMatch: 'full' },
  { path: '**', redirectTo: '/tv' } // Rota curinga para páginas não encontradas
];
