import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class GerencimantoParametroService {

  private api = 'http://localhost:3000/parametros';

  constructor(private http: HttpClient) {}

  getParametros() {
    return this.http.get<any[]>(this.api);
  }

  getMatrizes() {
    return this.http.get<any[]>('http://localhost:3000/matrizes');
  }

  getLegislacoes() {
    return this.http.get<any[]>('http://localhost:3000/legislacoes');
  }

  updateParametro(id: number, dados: any) {
    return this.http.put(`${this.api}/${id}`, dados);
  }
}
