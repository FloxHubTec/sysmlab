// src/app/resultado-analise/resultado-analise.component.ts
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ResultadoAnaliseService, ResultadoAnalise, Amostra, Parametro, Matriz, Legislacao, ApiResponse, CreateResponse } from './/resultado-analise.service';

@Component({
  selector: 'app-resultado-analise',
  templateUrl: './resultado-analise.component.html',
  styleUrls: ['./resultado-analise.component.css'],
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule]
})
export class ResultadoAnaliseComponent implements OnInit {
  // Arrays completos
  todosResultados: ResultadoAnalise[] = [];
  resultadosPaginados: ResultadoAnalise[] = [];

  // Variáveis de Estado Auxiliares
  numeroAmostraSelecionada: string = '';
  amostraSelecionada: Amostra | null = null;
  parametroSelecionado: Parametro | null = null;

  // REMOVIDO: erroMatrizIncompativel

  amostras: Amostra[] = [];
  parametros: Parametro[] = [];
  matrizes: Matriz[] = [];
  legislacoes: Legislacao[] = [];

  resultadoForm: FormGroup;
  isEditing = false;
  editingId?: number;
  loading = false;

  // Filtros
  filtroCodigoAmostra: string = '';
  filtroDataColeta: string = '';
  filtroStatus: string = '';
  filtroParametro: string = '';

  // Paginação
  paginaAtual: number = 1;
  itensPorPagina: number = 10;
  totalItens: number = 0;
  totalPaginas: number = 0;
  paginas: number[] = [];

  resultadoParaVisualizacao: ResultadoAnalise | null = null;

  constructor(
    private resultadoService: ResultadoAnaliseService,
    private fb: FormBuilder
  ) {
    this.resultadoForm = this.createForm();
  }

  ngOnInit(): void {
    this.loadData();
    this.setupAmostraListener();
    this.setupParametroListener();
  }

  createForm(): FormGroup {
    return this.fb.group({
      valor_medido: ['', [Validators.required, Validators.min(0)]],
      amostra_id: ['', Validators.required],
      parametro_id: ['', Validators.required],
      datacoleta: ['', [Validators.required, Validators.pattern(/^(0[1-9]|[12][0-9]|3[01])\/(0[1-9]|1[0-2])\/\d{4}$/), this.validarDataPassada]],
      matriz: ['', Validators.required],
      legislacao: ['', Validators.required]
    });
  }

  validarDataPassada(control: AbstractControl) {
    const valor = control.value;
    if (!valor || valor.length !== 10) return null;

    const partes = valor.split('/');
    const dia = parseInt(partes[0], 10);
    const mes = parseInt(partes[1], 10) - 1;
    const ano = parseInt(partes[2], 10);

    const dataInserida = new Date(ano, mes, dia);
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    if (dataInserida > hoje) return { dataFutura: true };
    return null;
  }

  loadData(): void {
    this.loading = true;

    Promise.all([
      this.resultadoService.getResultados().toPromise(),
      this.resultadoService.getAmostras().toPromise(),
      this.resultadoService.getParametros().toPromise(),
      this.resultadoService.getMatrizes().toPromise(),
      this.resultadoService.getLegislacoes().toPromise()
    ]).then(([resultados, amostras, parametros, matrizes, legislacoes]) => {
      this.todosResultados = resultados?.data || [];
      this.amostras = amostras?.data || [];
      this.parametros = parametros?.data || [];
      this.matrizes = matrizes?.data || [];
      this.legislacoes = legislacoes?.data || [];

      this.aplicarFiltrosSomenteQuandoDadosEstiveremProntos();
    }).catch((error: any) => {
      console.error('Erro ao carregar dados:', error);
      alert('Erro ao carregar dados do servidor');
    }).finally(() => {
      this.loading = false;
    });
  }

  visualizarResultado(resultado: ResultadoAnalise): void {
    this.resultadoParaVisualizacao = resultado;
  }

  fecharVisualizacao(): void {
    this.resultadoParaVisualizacao = null;
  }

  setupAmostraListener(): void {
    this.resultadoForm.get('amostra_id')?.valueChanges.subscribe(amostraId => {
      if (amostraId) {
        // Uso '==' para aceitar string ou number
        this.amostraSelecionada = this.amostras.find(a => a.id == amostraId) || null;
        this.numeroAmostraSelecionada = this.amostraSelecionada?.numero_da_amostra || '';

        // Auto-sugestão de Matriz (apenas sugestão, usuário pode mudar)
        if (this.amostraSelecionada && !this.isEditing) {
          this.resultadoForm.patchValue({ matriz: this.amostraSelecionada.matriz_id });
        }
      } else {
        this.amostraSelecionada = null;
        this.numeroAmostraSelecionada = '';
      }
      // REMOVIDO: this.verificarConsistenciaMatrizFrontend();
    });
  }

  setupParametroListener(): void {
    this.resultadoForm.get('parametro_id')?.valueChanges.subscribe(paramId => {
      if (paramId) {
        this.parametroSelecionado = this.parametros.find(p => p.id == paramId) || null;

        // Auto-sugestão de Legislação
        if (this.parametroSelecionado && !this.isEditing) {
          this.resultadoForm.patchValue({ legislacao: this.parametroSelecionado.legislacao_id });
        }
      } else {
        this.parametroSelecionado = null;
      }
      // REMOVIDO: this.verificarConsistenciaMatrizFrontend();
    });
  }

  // REMOVIDO: verificarConsistenciaMatrizFrontend() inteiro

  onSubmit(): void {
    // REMOVIDO: && !this.erroMatrizIncompativel
    if (this.resultadoForm.valid) {
      this.loading = true;
      const formData = this.resultadoForm.value;

      console.log('--- ENVIANDO FORMULÁRIO ---');

      const dataParts = formData.datacoleta.split('/');
      const dataFormatada = `${dataParts[2]}-${dataParts[1]}-${dataParts[0]}`;

      const resultadoParaEnvio = {
        valor_medido: parseFloat(formData.valor_medido),
        amostra_id: Number(formData.amostra_id),
        parametro_id: Number(formData.parametro_id),
        datacoleta: new Date(dataFormatada).toISOString(),

        // ENVIO MANUAL (Garantindo que a escolha do usuário seja respeitada)
        matriz_id_selecionada: formData.matriz ? Number(formData.matriz) : null,
        legislacao_id_selecionada: formData.legislacao ? Number(formData.legislacao) : null
      };

      console.log('Payload:', resultadoParaEnvio);

      let operation;
      if (this.isEditing && this.editingId) {
        operation = this.resultadoService.updateResultado(this.editingId, resultadoParaEnvio);
      } else {
        operation = this.resultadoService.createResultado(resultadoParaEnvio);
      }

      operation.subscribe({
        next: (response) => {
          alert(`Operação realizada com sucesso!`);
          this.loadData();
          this.resetForm();
        },
        error: (error) => {
          console.error('Erro:', error);
          alert(error.error?.message || 'Erro desconhecido');
        },
        complete: () => this.loading = false
      });
    } else {
      this.markFormGroupTouched();
      alert('Verifique os campos obrigatórios.');
    }
  }

  editResultado(resultado: ResultadoAnalise): void {
    this.isEditing = true;
    this.editingId = resultado.id;

    // 1. Data
    let dataFormatada = '';
    if (resultado.datacoleta) {
      const dataParts = resultado.datacoleta.toString().split('T')[0].split('-');
      dataFormatada = `${dataParts[2]}/${dataParts[1]}/${dataParts[0]}`;
    }

    // 2. Auxiliares
    const amostraId = Number(resultado.amostra_id);
    const parametroId = Number(resultado.parametro_id);

    this.amostraSelecionada = this.amostras.find(a => a.id == amostraId) || null;
    this.numeroAmostraSelecionada = this.amostraSelecionada?.numero_da_amostra || '';
    this.parametroSelecionado = this.parametros.find(p => p.id == parametroId) || null;

    // 3. RECUPERAÇÃO DE SELEÇÃO MANUAL (Reverse Lookup)

    // --- MATRIZ ---
    let matrizIdParaForm = null;
    if (resultado.matriz) {
      const matrizEncontrada = this.matrizes.find(m => m.nome === resultado.matriz);
      matrizIdParaForm = matrizEncontrada ? matrizEncontrada.id : null;
    }
    if (!matrizIdParaForm) matrizIdParaForm = this.amostraSelecionada?.matriz_id;

    // --- LEGISLAÇÃO (CORREÇÃO AQUI) ---
    let legislacaoIdParaForm = null;

    if (resultado.legislacao) {
      // O banco salva "Nome (Sigla)". Precisamos encontrar qual item da lista gera essa string.
      // Ou, se for difícil bater a string exata, tentamos pelo ID salvo (se tivéssemos salvo o ID).
      // Como salvamos TEXTO, vamos tentar achar pelo texto.

      const legisEncontrada = this.legislacoes.find(l => {
        const nomeFormatado = `${l.nome} (${l.sigla})`;
        return nomeFormatado === resultado.legislacao; // Comparação exata
      });

      legislacaoIdParaForm = legisEncontrada ? legisEncontrada.id : null;
    }

    // Fallback: Se não achou pelo texto (ou texto estava vazio), usa o padrão do parâmetro
    if (!legislacaoIdParaForm) {
      legislacaoIdParaForm = this.parametroSelecionado?.legislacao_id;
    }

    // 4. Preenche Form
    this.resultadoForm.patchValue({
      valor_medido: resultado.valor_medido,
      amostra_id: amostraId,
      parametro_id: parametroId,
      datacoleta: dataFormatada,
      matriz: matrizIdParaForm,
      legislacao: legislacaoIdParaForm
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  deleteResultado(id: number): void {
    if (confirm('Tem certeza que deseja excluir este resultado?')) {
      this.loading = true;
      this.resultadoService.deleteResultado(id).subscribe({
        next: () => {
          alert('Excluído com sucesso!');
          this.loadData();
        },
        error: () => {
          alert('Erro ao excluir');
          this.loading = false;
        }
      });
    }
  }

  resetForm(): void {
    this.resultadoForm.reset();
    this.isEditing = false;
    this.editingId = undefined;
    this.amostraSelecionada = null;
    this.parametroSelecionado = null;
    this.numeroAmostraSelecionada = '';
    // REMOVIDO: this.erroMatrizIncompativel = false;
  }

  markFormGroupTouched(): void {
    Object.keys(this.resultadoForm.controls).forEach(key => {
      this.resultadoForm.get(key)?.markAsTouched();
    });
  }

  // --- Helpers e Filtros (Mantidos iguais) ---

  formatarData(event: Event) {
    const input = event.target as HTMLInputElement;
    let value = input.value.replace(/\D/g, '');
    if (value.length > 8) value = value.substring(0, 8);
    if (value.length > 4) {
      value = value.substring(0, 2) + '/' + value.substring(2, 4) + '/' + value.substring(4);
    } else if (value.length > 2) {
      value = value.substring(0, 2) + '/' + value.substring(2);
    }
    input.value = value;
    this.resultadoForm.get('datacoleta')?.setValue(value, { emitEvent: false });
  }

  formatarDataFiltro(event: Event) {
    const input = event.target as HTMLInputElement;
    let value = input.value.replace(/\D/g, '');
    if (value.length > 8) value = value.substring(0, 8);
    if (value.length > 4) {
      value = value.substring(0, 2) + '/' + value.substring(2, 4) + '/' + value.substring(4);
    } else if (value.length > 2) {
      value = value.substring(0, 2) + '/' + value.substring(2);
    }
    input.value = value;
    this.filtroDataColeta = value;
  }

  getAmostraCodigo(id: number) { const a = this.amostras.find(x => x.id == id); return a ? a.codigo_amostra : ''; }
  getAmostraNumero(id: number) { const a = this.amostras.find(x => x.id == id); return a ? a.numero_da_amostra : ''; }
  getParametroNome(id: number) { const p = this.parametros.find(x => x.id == id); return p ? p.nome : 'N/A'; }

  getStatusConformidade(res: any) {
    const p = this.parametros.find(x => x.id == res.parametro_id);
    if (!p || !p.limite_minimo || !p.limite_maximo) return 'conforme';
    if (res.valor_medido < p.limite_minimo || res.valor_medido > p.limite_maximo) return 'nao-conforme';
    return 'conforme';
  }
  getStatusText(s: string) { return s === 'nao-conforme' ? 'Não Conforme' : 'Conforme'; }

  private aplicarFiltrosSomenteQuandoDadosEstiveremProntos(): void {
    if (!this.todosResultados.length || !this.amostras.length) {
      setTimeout(() => this.aplicarFiltrosSomenteQuandoDadosEstiveremProntos(), 20);
      return;
    }
    this.aplicarFiltros();
  }

  aplicarFiltros(): void {
    let res = [...this.todosResultados];
    if (this.filtroCodigoAmostra) res = res.filter(r => this.getAmostraCodigo(r.amostra_id).toLowerCase().includes(this.filtroCodigoAmostra.toLowerCase()));

    if (this.filtroDataColeta && this.filtroDataColeta.length === 10) {
      const p = this.filtroDataColeta.split('/');
      const busca = `${p[2]}-${p[1]}-${p[0]}`;
      res = res.filter(r => r.datacoleta && new Date(r.datacoleta).toISOString().split('T')[0] === busca);
    }

    if (this.filtroStatus) res = res.filter(r => this.getStatusConformidade(r) === this.filtroStatus);
    if (this.filtroParametro) res = res.filter(r => r.parametro_id.toString() === this.filtroParametro);

    this.totalItens = res.length;
    this.totalPaginas = Math.ceil(this.totalItens / this.itensPorPagina);
    this.paginas = Array.from({ length: this.totalPaginas }, (_, i) => i + 1);

    const inicio = (this.paginaAtual - 1) * this.itensPorPagina;
    this.resultadosPaginados = res.slice(inicio, inicio + this.itensPorPagina);
  }

  limparFiltros() {
    this.filtroCodigoAmostra = ''; this.filtroDataColeta = ''; this.filtroStatus = ''; this.filtroParametro = '';
    this.paginaAtual = 1; this.aplicarFiltros();
  }

  mudarPagina(p: number) { this.paginaAtual = p; this.aplicarFiltros(); }
  anterior() { if (this.paginaAtual > 1) this.mudarPagina(this.paginaAtual - 1); }
  proxima() { if (this.paginaAtual < this.totalPaginas) this.mudarPagina(this.paginaAtual + 1); }
  getRangeInicio() { return (this.paginaAtual - 1) * this.itensPorPagina + 1; }
  getRangeFim() { const f = this.paginaAtual * this.itensPorPagina; return f > this.totalItens ? this.totalItens : f; }
  atualizarTabela() { this.loadData(); }
}
