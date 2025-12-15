import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, RouterOutlet, Router } from '@angular/router';
import { AuthService } from './acessos/auth/auth.service';

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
export class AppComponent implements OnInit {
  isLoading = true; // Começa como true para mostrar loading inicial
  isLoggedIn = false;
  userName = '';
  userEmail = '';

  constructor(private authService: AuthService, private router: Router) {
    // Simula carregamento inicial
    setTimeout(() => {
      this.isLoading = false;
    }, 1500);
  }

  ngOnInit() {
    this.authService.isLoggedIn$.subscribe(async (status) => {
      this.isLoggedIn = status;
      if (status) {
        const session = await this.authService.getSession();
        if (session?.user) {
          this.userName = session.user.user_metadata?.nome ||
                          session.user.user_metadata?.full_name ||
                          session.user.user_metadata?.name ||
                          'Gestor Admin';
          this.userEmail = session.user.email || '';
        }
      }
    });
  }

  async logout() {
    if (confirm('Tem certeza que deseja sair do sistema?')) {
      try {
        await this.authService.logout();
      } catch (error) {
        console.error('Erro ao realizar logout:', error);
      } finally {
        this.isLoggedIn = false;
        this.userName = '';
        this.userEmail = '';
        this.router.navigate(['/login']);
      }
    }
  }
}
