import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
// Importe o serviço criado no passo anterior
import { AlertaNaoConformidadeService, Alerta, AlertaStats } from './alerta-naoconformidade.service';

@Component({
  selector: 'app-alertas',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './alerta-naoconformidade.component.html',
  styleUrls: ['./alerta-naoconformidade.component.css']
})
export class AlertaNaoConformidadeComponent implements OnInit {

  // Dados brutos
  alertas: Alerta[] = [];

  // Dados filtrados para exibição na tabela
  alertasFiltrados: Alerta[] = [];

  // Estatísticas para os cards
  stats: AlertaStats = { total: 0, alerta: 0, naoConforme: 0, critico: 0 };

  // Controles de Filtro
  filtroTexto: string = '';
  filtroStatus: string = 'Todos';

  // Controle de Carregamento
  isLoading: boolean = false;
  erroApi: boolean = false;

  constructor(private alertaNaoConformidadeService: AlertaNaoConformidadeService) {}

  ngOnInit(): void {
    this.carregarDados();
  }

  carregarDados(): void {
    this.isLoading = true;
    this.erroApi = false;

    this.alertaNaoConformidadeService.getAlertas().subscribe({
      next: (response) => {
        if (response.success) {
          this.alertas = response.data;
          this.stats = response.stats;

          // Aplica filtros iniciais (mostra tudo)
          this.aplicarFiltros();
        }
      },
      error: (err) => {
        console.error('Erro ao carregar alertas:', err);
        this.erroApi = true;
      },
      complete: () => {
        this.isLoading = false;
      }
    });
  }

  aplicarFiltros(): void {
    const termo = this.filtroTexto.toLowerCase().trim();

    this.alertasFiltrados = this.alertas.filter(item => {
      // 1. Filtro por Texto (Parâmetro ou Matriz)
      const matchTexto =
        (item.parametro_nome && item.parametro_nome.toLowerCase().includes(termo)) ||
        (item.matriz_nome && item.matriz_nome.toLowerCase().includes(termo));

      // 2. Filtro por Status (Dropdown)
      const matchStatus =
        this.filtroStatus === 'Todos' ||
        item.status === this.filtroStatus;

      return matchTexto && matchStatus;
    });
  }

  // Helper para limpar filtros rapidamente
  limparFiltros(): void {
    this.filtroTexto = '';
    this.filtroStatus = 'Todos';
    this.aplicarFiltros();
  }
}
