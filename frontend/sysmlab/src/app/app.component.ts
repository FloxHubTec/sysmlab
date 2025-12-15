import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule, // ← NECESSÁRIO para *ngIf
    RouterOutlet,
    RouterModule
  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  isLoading = true; // Começa como true para mostrar loading inicial

  constructor() {
    // Simula carregamento inicial
    setTimeout(() => {
      this.isLoading = false;
    }, 1500);
  }

  logout() {
    if (confirm('Tem certeza que deseja sair do sistema?')) {
      console.log('Usuário desconectado');
      // Aqui você implementaria o logout real
      // window.location.href = '/login';
    }
  }
}
