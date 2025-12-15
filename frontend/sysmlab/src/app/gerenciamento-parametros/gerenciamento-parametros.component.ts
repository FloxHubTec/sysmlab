import { Component, OnInit } from '@angular/core';
import { GerencimantoParametroService } from './gerencimento-parametros.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';


@Component({
  selector: 'app-gerenciamento-parametros',
  standalone: true,
  imports: [CommonModule,FormsModule],
  templateUrl: './gerenciamento-parametros.component.html',
  styleUrls: ['./gerenciamento-parametros.component.css']
})
export class GerenciamentoParametrosComponent implements OnInit {

  parametros: any[] = [];
  matrizes: any[] = [];
  legislacoes: any[] = [];

  editando = false;

  form: any = {};

  constructor(private gerenciamentoParametroService: GerencimantoParametroService) {}

  ngOnInit() {
    this.carregarTudo();
  }

  carregarTudo() {
    this.gerenciamentoParametroService.getParametros().subscribe(data => this.parametros = data);
    this.gerenciamentoParametroService.getMatrizes().subscribe(data => this.matrizes = data);
    this.gerenciamentoParametroService.getLegislacoes().subscribe(data => this.legislacoes = data);
  }

  abrirEdicao(item: any) {
    this.form = { ...item };
    this.editando = true;
  }

  fechar() {
    this.editando = false;
  }

  salvar() {
    this.gerenciamentoParametroService.updateParametro(this.form.id, this.form).subscribe(() => {
      this.editando = false;
      this.carregarTudo();
    });
  }
}
