import { BaseChartDirective, provideCharts, withDefaultRegisterables } from 'ng2-charts';
import { ChartConfiguration, ChartData, ChartType } from 'chart.js';
import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from '../acessos/auth/auth.service';


@Component({
  selector: 'app-grafico-parametros',
  standalone: true,
  imports: [CommonModule, BaseChartDirective],
  providers: [provideCharts(withDefaultRegisterables()),],
  templateUrl: './grafico-parametro.component.html',
  styleUrls: ['./grafico-parametro.component.css']
})
export class GraficoParametroComponent implements OnInit {

  public barChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      title: { display: true, text: 'Valores dos Parâmetros', font: { size: 16 } },
      tooltip: {
        backgroundColor: 'rgba(30, 41, 59, 0.9)',
        callbacks: {
          label: (context) => `Valor Ref: ${Number(context.raw).toFixed(4)}`
        }
      }
    },
    scales: {
      x: { grid: { display: false }, ticks: { autoSkip: false, maxRotation: 45, minRotation: 45 } },
      y: { beginAtZero: true, grid: { color: '#f1f5f9' }, title: { display: true, text: 'Valor de Referência' } }
    }
  };

  public barChartType: ChartType = 'bar';

  public barChartData: ChartData<'bar'> = { labels: [], datasets: [] };

  constructor(private auth: AuthService, private http: HttpClient) {}

  ngOnInit(): void {
    this.carregarDadosDoGrafico();
  }

  carregarDadosDoGrafico(): void {
    const session = this.auth.getSessionSync();
    if (!session) {
      console.error('Usuário não autenticado');
      return;
    }

    const token = session.access_token;
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });

    this.http.get<{ success: boolean, data: any[] }>('http://localhost:3000/grafico-parametros', { headers })
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            const labels = response.data.map(item => item.parametro);
            const valoresReferencia = response.data.map(item => Number(item.valor_parametro));

            this.barChartData = {
              labels,
              datasets: [
                {
                  data: valoresReferencia,
                  label: 'Valor de Referência',
                  backgroundColor: '#4361ee',
                  hoverBackgroundColor: '#3a0ca3',
                  borderRadius: 4,
                  barThickness: 40
                }
              ]
            };
          }
        },
        error: (err) => console.error('Erro ao carregar gráfico:', err)
      });
  }
}
