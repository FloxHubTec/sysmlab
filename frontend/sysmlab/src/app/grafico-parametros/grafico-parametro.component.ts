import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseChartDirective, provideCharts, withDefaultRegisterables } from 'ng2-charts';
import { ChartConfiguration, ChartData, ChartType } from 'chart.js';
import { GraficoParametroService } from './grafico-parametro.service';

@Component({
  selector: 'app-grafico-parametros',
  standalone: true,
  imports: [CommonModule, BaseChartDirective],
  providers: [
    provideCharts(withDefaultRegisterables())
  ],
  templateUrl: './grafico-parametro.component.html',
  styleUrls: ['./grafico-parametro.component.css']
})
export class GraficoParametroComponent implements OnInit {

  public barChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false, // Removemos a legenda pois só tem uma barra agora
      },
      title: {
        display: true,
        text: 'Valores dos Parâmetros',
        font: { size: 16 }
      },
      tooltip: {
        backgroundColor: 'rgba(30, 41, 59, 0.9)',
        callbacks: {
          label: (context) => `Valor Ref: ${Number(context.raw).toFixed(4)}`
        }
      }
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { autoSkip: false, maxRotation: 45, minRotation: 45 }
      },
      y: {
        beginAtZero: true,
        grid: { color: '#f1f5f9' },
        title: { display: true, text: 'Valor de Referência' }
      }
    }
  };

  public barChartType: ChartType = 'bar';

  public barChartData: ChartData<'bar'> = {
    labels: [],
    datasets: []
  };

  constructor(private graficoService: GraficoParametroService) {}

  ngOnInit(): void {
    this.carregarDadosDoGrafico();
  }

  carregarDadosDoGrafico(): void {
    this.graficoService.getDadosGrafico().subscribe({
      next: (response) => {
        if (response.success && response.data) {

          // 1. Labels (Nome do Parâmetro)
          const labels = response.data.map((item: any) => item.parametro);

          // 2. Valores (Valor de Referência do Banco)
          const valoresReferencia = response.data.map((item: any) => Number(item.valor_parametro));

          // 3. Atualiza o gráfico com APENAS UM dataset
          this.barChartData = {
            labels: labels,
            datasets: [
              {
                data: valoresReferencia,
                label: 'Valor de Referência',
                backgroundColor: '#4361ee', // Azul
                hoverBackgroundColor: '#3a0ca3',
                borderRadius: 4,
                barThickness: 40
              }
            ]
          };
        }
      },
      error: (err) => console.error('Erro:', err)
    });
  }
}
