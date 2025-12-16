import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class GerencimantoParametroService {

  private api = 'http://localhost:3000/gerenciamento-parametros';

  constructor(private http: HttpClient) {}

  getTela() {
    return this.http.get<any>(this.api);
  }

  updateParametro(id: number, dados: any) {
    return this.http.put(`http://localhost:3000/parametros/${id}`, dados);
  }
}
