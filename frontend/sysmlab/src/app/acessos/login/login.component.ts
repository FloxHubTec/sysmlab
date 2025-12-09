import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../auth/auth.service';


@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  form: FormGroup;
  loading = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      senha: ['', [Validators.required]]
    });
  }

  onSubmit(): void {
    if (this.form.invalid) return;

    this.loading = true;

    const { email, senha } = this.form.value;

    this.authService.login({ email, senha }).subscribe({
      next: (res) => {
        this.authService.saveSession(res);
        this.loading = false;
        this.router.navigateByUrl('/resultados-analise');
      },
      error: (err) => {
        console.error('Erro no login', err);
        this.loading = false;
      }
    });
  }

  goToForgotPassword(): void {
    this.router.navigate(['/recuperar-senha']);
  }
}
