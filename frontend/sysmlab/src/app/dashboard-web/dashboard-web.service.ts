import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Legislacao {
  id: number;
  nome: string;
  sigla: string;
}

export interface Matriz {
  id: number;
  nome: string;
}

export interface ComplianceData {
  id: number;
  parameter_name: string;
  current_value: number;
  min_limit: number;          // Propriedade padrão
  max_limit: number;          // Propriedade padrão
  unit: string;
  status: 'conforme' | 'alerta' | 'critico' | 'nao-conforme';
  last_update: string;
  porcentagem?: number;
  matriz_nome?: string;
  legislacao_sigla?: string;
  limite_minimo?: number;
  limite_maximo?: number;
  unidade_medida?: string;
  valor_parametro?: number;
  legislacao_nome?: string;

  [key: string]: any;
}

export interface DashboardResponse {
  success: boolean;
  data: ComplianceData[];
  statistics: {
    compliant_count: number;
    alert_count: number;
    critical_count: number;
    non_compliant_count: number;
    total_parameters: number;
  };
  last_updated: string;
  filters_applied?: any;
  message?: string;
}

@Injectable({
  providedIn: 'root'
})
export class DashboardWebService {
  // ✅ CORRIGIDO: Agora aponta para a rota correta
  private apiUrl = 'http://localhost:3000/dashboard-web';

  constructor(private http: HttpClient) { }

  /**
   * Obtém todos os dados do dashboard (inclui parâmetros e estatísticas)
   */
  getDashboardData(filters?: { matrizId?: number, legislacaoId?: number }): Observable<DashboardResponse> {
    let params = new HttpParams();

    if (filters?.matrizId) {
      params = params.append('matriz_id', filters.matrizId.toString());
    }

    if (filters?.legislacaoId) {
      params = params.append('legislacao_id', filters.legislacaoId.toString());
    }

    return this.http.get<DashboardResponse>(this.apiUrl, { params });
  }

  /**
   * Obtém apenas os parâmetros (extrai do response completo)
   */
  getParameters(filters?: { matrizId?: number, legislacaoId?: number }): Observable<ComplianceData[]> {
    return this.getDashboardData(filters).pipe(
      map(response => response.data)
    );
  }

  /**
   * Obtém apenas as estatísticas
   */
  getStats(filters?: { matrizId?: number, legislacaoId?: number }): Observable<any> {
    return this.getDashboardData(filters).pipe(
      map(response => response.statistics)
    );
  }

  getFilterOptions() {
    return this.http.get<any>(`${this.apiUrl}/filter-options`);
  }


}
