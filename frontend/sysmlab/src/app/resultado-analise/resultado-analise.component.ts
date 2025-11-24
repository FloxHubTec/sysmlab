// src/app/resultado-analise/resultado-analise.component.ts
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
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
  erroMatrizIncompativel: boolean = false;

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
  //a variável guarda os dados para quando eu clicar no olho da tabela
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
    this.setupParametroListener(); // CORREÇÃO: Chamada adicionada!
  }

  createForm(): FormGroup {
    return this.fb.group({
      valor_medido: ['', [Validators.required, Validators.min(0)]],
      amostra_id: ['', Validators.required],
      parametro_id: ['', Validators.required],
      datacoleta: ['', [Validators.required, Validators.pattern(/^(0[1-9]|[12][0-9]|3[01])\/(0[1-9]|1[0-2])\/\d{4}$/)
        ,
      this.validarDataPassada
      ]],

      matriz: ['', Validators.required],
      legislacao: ['', Validators.required]
    });
  }

  //impede que a data da coleta seja inserida com uma data futura
  validarDataPassada(control: any) {
    const valor = control.value;

    // Se não tiver valor ou não estiver completo (10 chars), deixa o validator required/pattern cuidar
    if (!valor || valor.length !== 10) {
      return null;
    }

    // Converte dd/mm/aaaa para Objeto Date
    const partes = valor.split('/');
    const dia = parseInt(partes[0], 10);
    const mes = parseInt(partes[1], 10) - 1; // Mês no JS começa em 0 (Jan = 0)
    const ano = parseInt(partes[2], 10);

    const dataInserida = new Date(ano, mes, dia);
    const hoje = new Date();

    // Zera as horas de hoje para comparar apenas a data (dia/mês/ano)
    hoje.setHours(0, 0, 0, 0);

    // Se a data inserida for maior que hoje -> ERRO
    if (dataInserida > hoje) {
      return { dataFutura: true }; // Retorna objeto de erro
    }

    return null; // Sem erro
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

  //abre a visualização quando eu clico no olho da tabela
  visualizarResultado(resultado: ResultadoAnalise): void {
    this.resultadoParaVisualizacao = resultado;
  }

  //fecha a visualização quanco eu clico no olho da tabela
  fecharVisualizacao(): void {
    this.resultadoParaVisualizacao = null;
  }

  setupAmostraListener(): void {
    this.resultadoForm.get('amostra_id')?.valueChanges.subscribe(amostraId => {
      if (amostraId) {
        this.amostraSelecionada = this.amostras.find(a => a.id == amostraId) || null;

        // Atualiza a variável que preenche o input visual
        this.numeroAmostraSelecionada = this.amostraSelecionada?.numero_da_amostra || '';
      } else {
        this.amostraSelecionada = null;
        this.numeroAmostraSelecionada = '';
      }

      // Chama a validação da matriz
      this.verificarConsistenciaMatrizFrontend();
    });
  }

  setupParametroListener(): void {
    this.resultadoForm.get('parametro_id')?.valueChanges.subscribe(paramId => {
      if (paramId) {
        // CORREÇÃO: Usar '==' para encontrar o ID mesmo se vier como string
        this.parametroSelecionado = this.parametros.find(p => p.id == paramId) || null;
      } else {
        this.parametroSelecionado = null;
      }

      // Chama a validação imediatamente após selecionar
      this.verificarConsistenciaMatrizFrontend();
    });
  }

  verificarConsistenciaMatrizFrontend(): void {
    this.erroMatrizIncompativel = false;

    // Só valida se AMBOS estiverem selecionados
    if (this.amostraSelecionada && this.parametroSelecionado) {
      if (this.amostraSelecionada.matriz_id != this.parametroSelecionado.matriz_id) {
        this.erroMatrizIncompativel = true;
        // Opcional: define erro no form, mas a variável booleana já controla o botão
        this.resultadoForm.setErrors({ 'inconsistenciaMatriz': true });
      } else {
        // Se a validação passou, limpa o erro se ele existia
        if (this.resultadoForm.hasError('inconsistenciaMatriz')) {
          this.resultadoForm.setErrors(null);
        }
      }
    }
  }

  onSubmit(): void {
    if (this.resultadoForm.valid && !this.erroMatrizIncompativel) {
      this.loading = true;
      const formData = this.resultadoForm.value;

      // 1. Converter data
      const dataParts = formData.datacoleta.split('/');
      const dataFormatada = `${dataParts[2]}-${dataParts[1]}-${dataParts[0]}`;

      // 2. Montar Objeto (AGORA INCLUINDO AS SELEÇÕES MANUAIS)
      const resultadoParaEnvio = {
        valor_medido: parseFloat(formData.valor_medido),
        amostra_id: Number(formData.amostra_id),
        parametro_id: Number(formData.parametro_id),
        datacoleta: new Date(dataFormatada).toISOString(),
        // FORÇANDO A CONVERSÃO PARA NÚMERO AQUI
        matriz_id_selecionada: formData.matriz ? Number(formData.matriz) : null,
        legislacao_id_selecionada: formData.legislacao ? Number(formData.legislacao) : null
      };

      console.log('Enviando para API:', resultadoParaEnvio);

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
      if (this.erroMatrizIncompativel) alert('Verifique a compatibilidade da Matriz.');
    }
  }

  editResultado(resultado: ResultadoAnalise): void {
    this.isEditing = true;
    this.editingId = resultado.id;

    // 1. Formatar Data
    let dataFormatada = '';
    if (resultado.datacoleta) {
      const dataParts = resultado.datacoleta.toString().split('T')[0].split('-');
      dataFormatada = `${dataParts[2]}/${dataParts[1]}/${dataParts[0]}`;
    }

    // 2. Recuperar Objetos Auxiliares (Amostra e Parâmetro)
    const amostraId = Number(resultado.amostra_id);
    const parametroId = Number(resultado.parametro_id);

    this.amostraSelecionada = this.amostras.find(a => a.id === amostraId) || null;
    this.numeroAmostraSelecionada = this.amostraSelecionada?.numero_da_amostra || '';
    this.parametroSelecionado = this.parametros.find(p => p.id === parametroId) || null;

    // 3. Preencher Formulário
    // AQUI ESTÁ O SEGREDO: Precisamos preencher matriz e legislacao com os IDs que o <select> espera
    this.resultadoForm.patchValue({
      valor_medido: resultado.valor_medido,
      amostra_id: amostraId,
      parametro_id: parametroId,
      datacoleta: dataFormatada,

      // CORREÇÃO: Preenche os selects visuais com os IDs corretos
      matriz: this.amostraSelecionada?.matriz_id,
      legislacao: this.parametroSelecionado?.legislacao_id
    });

    // 4. Rolar para o topo e validar
    window.scrollTo({ top: 0, behavior: 'smooth' });
    this.verificarConsistenciaMatrizFrontend();
  }

  deleteResultado(id: number): void {
    // 1. Confirmação de segurança (UX)
    if (confirm('Tem certeza que deseja excluir este resultado permanentemente?')) {

      this.loading = true; // Ativa o spinner

      // 2. Chama o serviço
      this.resultadoService.deleteResultado(id).subscribe({
        next: (response) => {
          // 3. Sucesso: Avisa e recarrega a tabela
          alert(response.message || 'Resultado excluído com sucesso!');

          // IMPORTANTE: Recarrega os dados para a linha sumir da tabela
          this.loadData();

          // Se estiver editando o item que foi excluído, limpa o formulário
          if (this.isEditing && this.editingId === id) {
            this.resetForm();
          }
        },
        error: (error) => {
          // 4. Erro
          console.error('Erro ao excluir:', error);
          alert(error.error?.message || 'Erro ao tentar excluir o resultado.');
        },
        complete: () => {
          this.loading = false; // Desativa o spinner
        }
      });
    }
  }

  resetForm(): void {
    this.resultadoForm.reset();
    this.isEditing = false;
    this.editingId = undefined;

    // CORREÇÃO: Limpar variáveis auxiliares
    this.amostraSelecionada = null;
    this.parametroSelecionado = null;
    this.numeroAmostraSelecionada = '';
    this.erroMatrizIncompativel = false;
  }

  markFormGroupTouched(): void {
    Object.keys(this.resultadoForm.controls).forEach(key => {
      this.resultadoForm.get(key)?.markAsTouched();
    });
  }

  // --- Métodos Auxiliares e Formatação ---

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

  // --- Métodos de Listagem e Helpers ---

  getAmostraCodigo(amostraId: number): string {
    if (!this.amostras || this.amostras.length === 0) return '';
    const amostra = this.amostras.find(a => a.id == amostraId); // '==' permite string/number
    return amostra ? amostra.codigo_amostra : '';
  }

  getAmostraNumero(amostraId: number): string {
    if (!this.amostras || this.amostras.length === 0) return '';
    const amostra = this.amostras.find(a => a.id == amostraId);
    return amostra ? amostra.numero_da_amostra : '';
  }

  getParametroNome(parametroId: number): string {
    const parametro = this.parametros.find(p => p.id == parametroId);
    return parametro ? parametro.nome : 'N/A';
  }

  getStatusConformidade(resultado: ResultadoAnalise): string {
    const parametro = this.parametros.find(p => p.id == resultado.parametro_id);
    if (!parametro || parametro.limite_minimo === null || parametro.limite_maximo === null) return 'conforme';

    if (resultado.valor_medido < parametro.limite_minimo || resultado.valor_medido > parametro.limite_maximo) {
      return 'nao-conforme';
    }

    const faixa = parametro.limite_maximo - parametro.limite_minimo;
    const valorNormalizado = (resultado.valor_medido - parametro.limite_minimo) / faixa;

    if (valorNormalizado > 0.9) return 'critico';
    if (valorNormalizado > 0.8) return 'alerta';

    return 'conforme';
  }

  getStatusText(status: string): string {
    const statusMap: { [key: string]: string } = {
      'conforme': 'Conforme',
      'nao-conforme': 'Não conforme',
      'alerta': 'Alerta',
      'critico': 'Crítico'
    };
    return statusMap[status] || 'Conforme';
  }

  carregarNumeroAmostra(amostraId: number): void {
    const amostra = this.amostras.find(a => a.id == amostraId);
    this.numeroAmostraSelecionada = amostra ? amostra.numero_da_amostra : '';
  }

  // --- Lógica de Filtros e Paginação ---

  private aplicarFiltrosSomenteQuandoDadosEstiveremProntos(): void {
    if (!this.todosResultados.length || !this.amostras.length) {
      setTimeout(() => this.aplicarFiltrosSomenteQuandoDadosEstiveremProntos(), 20);
      return;
    }
    this.aplicarFiltros();
  }

  aplicarFiltros(): void {
    let resultadosFiltrados = [...this.todosResultados];

    if (this.filtroCodigoAmostra) {
      resultadosFiltrados = resultadosFiltrados.filter(resultado => {
        const amostraCodigo = this.getAmostraCodigo(resultado.amostra_id).toLowerCase();
        return amostraCodigo.includes(this.filtroCodigoAmostra.toLowerCase());
      });
    }

    // Aplicar filtro por data da coleta
    if (this.filtroDataColeta && this.filtroDataColeta.length === 10) {
      // O formato do filtro é dd/MM/yyyy (ex: 25/11/2025)
      // Precisamos converter para yyyy-MM-dd para comparar (ex: 2025-11-25)

      const partes = this.filtroDataColeta.split('/');
      // partes[0] = dia, partes[1] = mes, partes[2] = ano

      // Cria a string de busca no formato ISO (yyyy-MM-dd)
      const dataBuscaISO = `${partes[2]}-${partes[1]}-${partes[0]}`;

      resultadosFiltrados = resultadosFiltrados.filter(resultado => {
        if (!resultado.datacoleta) return false;

        // Pega a data do resultado que vem do banco (ex: 2025-11-25T14:30:00.000Z)
        // E extrai apenas a parte da data (yyyy-MM-dd)
        const dataResultadoISO = new Date(resultado.datacoleta).toISOString().split('T')[0];

        return dataResultadoISO === dataBuscaISO;
      });
    }

    if (this.filtroStatus) {
      resultadosFiltrados = resultadosFiltrados.filter(resultado => {
        return this.getStatusConformidade(resultado) === this.filtroStatus;
      });
    }

    if (this.filtroParametro) {
      resultadosFiltrados = resultadosFiltrados.filter(resultado => {
        return resultado.parametro_id.toString() === this.filtroParametro;
      });
    }

    this.totalItens = resultadosFiltrados.length;
    this.totalPaginas = Math.ceil(this.totalItens / this.itensPorPagina);

    this.paginas = [];
    for (let i = 1; i <= this.totalPaginas; i++) {
      this.paginas.push(i);
    }

    const inicio = (this.paginaAtual - 1) * this.itensPorPagina;
    const fim = inicio + this.itensPorPagina;
    this.resultadosPaginados = resultadosFiltrados.slice(inicio, fim);
  }

  limparFiltros(): void {
    this.filtroCodigoAmostra = '';
    this.filtroDataColeta = '';
    this.filtroStatus = '';
    this.filtroParametro = '';
    this.paginaAtual = 1;
    this.aplicarFiltros();
  }

  mudarPagina(pagina: number): void {
    if (pagina >= 1 && pagina <= this.totalPaginas) {
      this.paginaAtual = pagina;
      this.aplicarFiltros();
    }
  }

  anterior(): void {
    if (this.paginaAtual > 1) this.mudarPagina(this.paginaAtual - 1);
  }

  proxima(): void {
    if (this.paginaAtual < this.totalPaginas) this.mudarPagina(this.paginaAtual + 1);
  }

  getRangeInicio(): number {
    return (this.paginaAtual - 1) * this.itensPorPagina + 1;
  }

  getRangeFim(): number {
    const fim = this.paginaAtual * this.itensPorPagina;
    return fim > this.totalItens ? this.totalItens : fim;
  }

  atualizarTabela(): void {
    this.loadData();
  }

}
