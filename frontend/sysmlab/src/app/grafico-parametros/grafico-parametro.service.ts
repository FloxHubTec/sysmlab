import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

// --- INTERFACES ---

// Define o formato do dado unitário que vem do banco para o gráfico
export interface DadosGrafico {
  parametro: string;
  valor_medio: number | string; // Postgres as vezes retorna decimal como string
  total_analises: number | string;
}

// Define o envelope padrão da sua API (success, data, message)
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  count?: number;
  message?: string;
  error?: string;
}

@Injectable({
  providedIn: 'root'
})
export class GraficoParametroService {

  // URL da Rota que criamos no Backend (ajuste a porta se necessário)
  private apiUrl = 'http://localhost:3000/grafico-parametros';

  constructor(private http: HttpClient) { }

  /**
   * Busca os dados agregados (Média por Parâmetro)
   * @returns Observable com a lista de dados para o gráfico
   */
  getDadosGrafico(): Observable<ApiResponse<DadosGrafico[]>> {
    return this.http.get<ApiResponse<DadosGrafico[]>>(this.apiUrl);
  }
}
