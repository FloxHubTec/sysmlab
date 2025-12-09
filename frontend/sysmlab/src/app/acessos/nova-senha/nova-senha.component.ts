import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../auth/auth.service';

@Component({
  selector: 'app-nova-senha',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './nova-senha.component.html',
  styleUrls: ['./nova-senha.component.css']
})
export class NovaSenhaComponent implements OnInit {
  form: FormGroup;
  loading = false;
  successMessage = '';
  errorMessage = '';
  accessToken = '';

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private authService: AuthService,
    private router: Router
  ) {
    this.form = this.fb.group(
      {
        senha: ['', [Validators.required, Validators.minLength(6)]],
        confirmarSenha: ['', [Validators.required]]
      },
      {
        validators: this.senhasIguaisValidator
      }
    );
  }

  ngOnInit(): void {
    const hash = window.location.hash;
    const params = new URLSearchParams(hash.replace('#', ''));
    this.accessToken = params.get('access_token') || '';

  }

  senhasIguaisValidator(group: AbstractControl): ValidationErrors | null {
    const senha = group.get('senha')?.value;
    const confirmar = group.get('confirmarSenha')?.value;

    return senha === confirmar ? null : { senhasDiferentes: true };
  }

  async onSubmit() {
    if (this.form.invalid || !this.accessToken) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;

    try {
      await this.authService.updatePassword(this.form.value.senha);
      this.successMessage = 'Senha atualizada com sucesso.';
      setTimeout(() => this.router.navigate(['/login']), 2000);
    } catch (err: any) {
      this.errorMessage = err?.message || 'Erro ao atualizar a senha.';
    } finally {
      this.loading = false;
    }
  }
}
