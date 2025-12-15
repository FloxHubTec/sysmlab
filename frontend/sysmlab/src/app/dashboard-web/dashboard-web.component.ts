import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DashboardWebService, DashboardResponse, ComplianceData } from './dashboard-web.service';
import { catchError, finalize, timeout, retry, delay } from 'rxjs/operators';
import { forkJoin, of, Subscription, throwError } from 'rxjs';

// Interface para a resposta de filtros
interface FilterOptionsResponse {
  success: boolean;
  matrizes: any[];
  legislacoes: any[];
  message?: string;
  timestamp?: string;
}

// Interface para os resultados do forkJoin
interface ForkJoinResults {
  filters: FilterOptionsResponse | null;
  data: DashboardResponse | null;
}

@Component({
  selector: 'app-dashboard-web',
  templateUrl: './dashboard-web.component.html',
  styleUrls: ['./dashboard-web.component.css'],
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class DashboardWebComponent implements OnInit, OnDestroy {
  // Filtros
  selectedMatriz: number | null = null;
  selectedLegislacao: number | null = null;

  // Dados principais
  parameters: ComplianceData[] = [];

  // Estatísticas
  totalParameters: number = 0;
  compliantCount: number = 0;
  alertCount: number = 0;
  criticalCount: number = 0;
  nonCompliantCount: number = 0;

  // UI States
  loading: boolean = true;
  loadingFilters: boolean = true;
  error: string | null = null;
  lastUpdated: string = new Date().toLocaleString('pt-BR');
  retryCount: number = 0;
  maxRetries: number = 3;

  // Arrays para os selects
  legislacoes: any[] = [];
  matrizes: any[] = [];

  // Debug
  debugInfo = {
    matrizesDoBanco: 0,
    legislacoesDoBanco: 0,
    parametrosRecebidos: 0
  };

  // Para controle de subscriptions
  private dataSubscription: Subscription | null = null;

  // Matrizes conhecidas do banco
  private todasMatrizesConhecidas = [
    { id: 1, nome: 'Água Tratada (Consumo)' },
    { id: 2, nome: 'Efluente Industrial' },
    { id: 3, nome: 'Água Bruta' }
  ];

  // Legislações conhecidas do banco - CORRIGIDO: Agora com ID correto para INTERNO
  private todasLegislacoesConhecidas = [
    { id: 1, nome: 'Portaria GM/MS nº 888/2021', sigla: 'P888/2021' },
    { id: 2, nome: 'Resolução CONAMA nº 357/2005 (Classes)', sigla: 'CONAMA 357' },
    { id: 3, nome: 'Limites Internos (Padrão CAERN)', sigla: 'INTERNO' }
  ];

  constructor(private dashboardService: DashboardWebService) { }

  ngOnInit() {
    console.log('=== INICIANDO DASHBOARD ===');
    this.carregarTudoComRetry();
  }

  ngOnDestroy() {
    // Cancela qualquer subscription pendente
    if (this.dataSubscription) {
      this.dataSubscription.unsubscribe();
    }
  }

  carregarTudoComRetry() {
    this.loading = true;
    this.loadingFilters = true;
    this.error = null;
    this.retryCount = 0;

    if (this.dataSubscription) {
      this.dataSubscription.unsubscribe();
    }

    this.executarCarregamentoComRetry();
  }

  private executarCarregamentoComRetry() {
    console.log(`Tentativa ${this.retryCount + 1}/${this.maxRetries}`);

    this.dataSubscription = forkJoin({
      filters: this.dashboardService.getFilterOptions().pipe(
        timeout(10000),
        catchError(err => {
          console.error('Erro ao carregar filtros:', err);
          return of({
            success: false,
            matrizes: [],
            legislacoes: [],
            message: this.getErrorMessage(err)
          } as FilterOptionsResponse);
        })
      ),

      data: this.dashboardService.getDashboardData({}).pipe(
        timeout(15000),
        catchError(err => {
          console.error('Erro ao carregar dados:', err);
          return of({
            success: false,
            data: [],
            statistics: {
              compliant_count: 0,
              alert_count: 0,
              critical_count: 0,
              non_compliant_count: 0,
              total_parameters: 0
            },
            last_updated: new Date().toISOString(),
            message: this.getErrorMessage(err)
          } as DashboardResponse);
        })
      )
    })
      .subscribe((results: ForkJoinResults) => {

        const erroFiltros = !results.filters?.success;
        const erroDados = !results.data?.success;

        // 🔄 Retry automático
        if ((erroFiltros || erroDados) && this.retryCount < this.maxRetries - 1) {
          this.retryCount++;
          console.warn(`Falha na tentativa ${this.retryCount}, tentando novamente...`);
          setTimeout(() => this.executarCarregamentoComRetry(), 2000);
          return;
        }

        // ==========================
        // PROCESSAR FILTROS
        // ==========================
        if (results.filters?.success) {
          this.error = null; // Limpa o erro se filtros carregarem
          this.matrizes = results.filters.matrizes;
          this.legislacoes = results.filters.legislacoes;

          this.debugInfo.matrizesDoBanco = this.matrizes.length;
          this.debugInfo.legislacoesDoBanco = this.legislacoes.length;
        } else {
          console.warn('⚠️ Usando filtros mínimos devido a erro.');
          this.matrizes = [];
          this.legislacoes = [];
          // Não define this.error aqui para não sobrepor a mensagem específica
        }

        this.completarMatrizesFaltantes();
        this.completarLegislacoesFaltantes();

        // ==========================
        // PROCESSAR DADOS PRINCIPAIS
        // ==========================
        if (results.data?.success) {
          this.parameters = results.data.data;
          this.debugInfo.parametrosRecebidos = this.parameters.length;
          this.atualizarEstatisticas(results.data.statistics);
          this.error = null; // ✅ Limpa o erro quando os dados carregam com sucesso
        } else {
          this.parameters = [];
          // Apenas define erro se realmente houver falha
          if (erroDados) {
            this.error = results.data?.message || 'Erro ao carregar dados do dashboard.';
          }
        }

        // ==========================
        // FINALIZAR CARREGAMENTO (SEGURO)
        // ==========================
        this.loading = false;
        this.loadingFilters = false;
        this.lastUpdated = new Date().toLocaleString('pt-BR');

        // 🔚 Erro definitivo após retry - CORRIGIDO
        // Só mostra erro geral se atingiu o máximo de tentativas E ainda há erro
        if (this.retryCount >= this.maxRetries - 1 && (erroFiltros || erroDados)) {
          // Mas não sobrescreve se já temos uma mensagem mais específica
          if (!this.error) {
            this.error = 'Não foi possível carregar os dados após várias tentativas.';
          }
        }
      });
  }


  private getErrorMessage(error: any): string {
    if (error.name === 'TimeoutError') {
      return 'Tempo limite excedido ao carregar dados. Verifique sua conexão.';
    } else if (error.status === 0) {
      return 'Não foi possível conectar ao servidor. Verifique sua conexão de internet.';
    } else if (error.status === 404) {
      return 'Serviço não encontrado. Entre em contato com o administrador.';
    } else if (error.status >= 500) {
      return 'Erro no servidor. Tente novamente mais tarde.';
    } else {
      return 'Erro ao carregar dados. Verifique a conexão.';
    }
  }

  // Método para tentar carregar novamente
  tentarNovamente() {
    console.log('Tentando carregar dados novamente...');
    this.retryCount = 0;
    this.error = null;
    this.loading = true;
    this.carregarTudoComRetry();
  }

  completarMatrizesFaltantes() {
    console.log('=== COMPLETANDO MATRIZES FALTANTES ===');

    // Verifica quantas matrizes temos
    console.log(`Matrizes atuais: ${this.matrizes.length}`);

    // Adiciona matrizes conhecidas que não estão na lista
    let matrizesAdicionadas = 0;

    this.todasMatrizesConhecidas.forEach(matrizConhecida => {
      const jaExiste = this.matrizes.some(m => m.id === matrizConhecida.id || m.nome === matrizConhecida.nome);

      if (!jaExiste) {
        console.log(`Adicionando matriz faltante: ${matrizConhecida.nome} (ID: ${matrizConhecida.id})`);
        this.matrizes.push({
          id: matrizConhecida.id,
          nome: matrizConhecida.nome
        });
        matrizesAdicionadas++;
      }
    });

    if (matrizesAdicionadas > 0) {
      console.log(`✅ ${matrizesAdicionadas} matriz(es) adicionada(s)`);
    }

    // Ordena por nome
    this.matrizes.sort((a, b) => a.nome.localeCompare(b.nome));

    // Atualiza contagem
    this.debugInfo.matrizesDoBanco = this.matrizes.length;
    console.log('Matrizes após completar:', this.matrizes);
  }

  completarLegislacoesFaltantes() {
    console.log('=== COMPLETANDO LEGISLAÇÕES FALTANTES ===');

    // Verifica quantas legislações temos
    console.log(`Legislações atuais: ${this.legislacoes.length}`);

    // Adiciona legislações conhecidas que não estão na lista
    let legislacoesAdicionadas = 0;

    this.todasLegislacoesConhecidas.forEach(legislacaoConhecida => {
      // Verifica por ID ou sigla
      const jaExiste = this.legislacoes.some(l =>
        l.id === legislacaoConhecida.id ||
        l.sigla === legislacaoConhecida.sigla ||
        l.nome === legislacaoConhecida.nome
      );

      if (!jaExiste) {
        console.log(`Adicionando legislação faltante: ${legislacaoConhecida.nome} (Sigla: ${legislacaoConhecida.sigla})`);

        // Remove duplicação no nome se existir
        let nomeFormatado = legislacaoConhecida.nome;
        if (legislacaoConhecida.sigla && nomeFormatado.includes(`(${legislacaoConhecida.sigla})`)) {
          nomeFormatado = nomeFormatado.replace(` (${legislacaoConhecida.sigla})`, '').trim();
        }

        this.legislacoes.push({
          id: legislacaoConhecida.id,
          nome: nomeFormatado,
          sigla: legislacaoConhecida.sigla
        });
        legislacoesAdicionadas++;
      }
    });

    if (legislacoesAdicionadas > 0) {
      console.log(`✅ ${legislacoesAdicionadas} legislação(ões) adicionada(s)`);
    }

    // ORDENAÇÃO DINÂMICA SEM HARDCODING
    this.ordenarLegislacoesDinamicamente();

    // Atualiza contagem
    this.debugInfo.legislacoesDoBanco = this.legislacoes.length;
    console.log('Legislações após completar:', this.legislacoes);
  }

  ordenarLegislacoesDinamicamente() {
    // Estratégia: Ordena por prioridade (nacionais primeiro, internos por último)

    // 1. Separa as legislações em categorias
    const legislaçõesNacionais = this.legislacoes.filter(l =>
      !this.eLegislacaoInterna(l)
    );

    const legislaçõesInternas = this.legislacoes.filter(l =>
      this.eLegislacaoInterna(l)
    );

    // 2. Ordena as nacionais alfabeticamente
    legislaçõesNacionais.sort((a, b) =>
      (a.nome || a.sigla || '').localeCompare(b.nome || b.sigla || '')
    );

    // 3. Ordena as internas alfabeticamente
    legislaçõesInternas.sort((a, b) =>
      (a.nome || a.sigla || '').localeCompare(b.nome || b.sigla || '')
    );

    // 4. Junta: nacionais primeiro, internas depois
    this.legislacoes = [...legislaçõesNacionais, ...legislaçõesInternas];
  }

  eLegislacaoInterna(legislacao: any): boolean {
    const sigla = legislacao.sigla?.toUpperCase() || '';
    const nome = legislacao.nome?.toUpperCase() || '';

    return (
      sigla.includes('INTERNO') ||
      nome.includes('INTERNO') ||
      nome.includes('LIMITES INTERNOS') ||
      nome.includes('PADRÃO INTERNO') ||
      nome.includes('INTERNAL') ||
      sigla === 'INTERNO'
    );
  }

  // ... (restante dos métodos permanecem iguais, mantive todos os métodos originais abaixo)

  verificarConsistenciaDados() {
    console.log('=== VERIFICANDO CONSISTÊNCIA ===');

    // Coletar IDs únicos dos parâmetros
    const matrizIdsNosParametros = new Set<number>();
    const legislacaoIdsNosParametros = new Set<number>();

    this.parameters.forEach(param => {
      const paramAny = param as any;
      if (paramAny.matriz_id) matrizIdsNosParametros.add(paramAny.matriz_id);
      if (paramAny.legislacao_id) legislacaoIdsNosParametros.add(paramAny.legislacao_id);
    });

    console.log('Matriz IDs nos parâmetros:', Array.from(matrizIdsNosParametros));
    console.log('Legislação IDs nos parâmetros:', Array.from(legislacaoIdsNosParametros));

    // Verificar quais filtros não têm parâmetros
    const matrizesSemParametros = this.matrizes.filter(m => !matrizIdsNosParametros.has(m.id));
    const legislacoesSemParametros = this.legislacoes.filter(l => !legislacaoIdsNosParametros.has(l.id));

    if (matrizesSemParametros.length > 0) {
      console.warn('⚠️  Matrizes sem parâmetros:', matrizesSemParametros.map(m => m.nome));
    }

    if (legislacoesSemParametros.length > 0) {
      console.warn('⚠️  Legislações sem parâmetros:', legislacoesSemParametros.map(l => l.nome));
    }

    // Se a legislação "INTERNO" não estiver nos parâmetros, explicar
    const legislacaoInterno = this.legislacoes.find(l => l.sigla === 'INTERNO');
    if (legislacaoInterno && !legislacaoIdsNosParametros.has(legislacaoInterno.id)) {
      console.warn('ℹ️  A legislação "INTERNO" não tem parâmetros no momento, mas aparece nos filtros.');
    }
  }

  get hasFilters(): boolean {
    return this.selectedMatriz !== null || this.selectedLegislacao !== null;
  }

  get hasData(): boolean {
    return this.parameters.length > 0 && !this.loading && !this.error;
  }

  get isEmpty(): boolean {
    return this.parameters.length === 0 && !this.loading && !this.error;
  }

  get complianceRate(): number {
    const total = this.parameters.length;
    if (total === 0) return 0;
    const compliant = this.parameters.filter(p => p.status === 'conforme').length;
    return (compliant / total) * 100;
  }

  filtrar() {
    console.log('Filtrando:', {
      matriz_id: this.selectedMatriz,
      legislacao_id: this.selectedLegislacao
    });

    this.loading = true;
    this.error = null;

    const filters: any = {};
    if (this.selectedMatriz) filters.matrizId = this.selectedMatriz;
    if (this.selectedLegislacao) filters.legislacaoId = this.selectedLegislacao;

    this.dashboardService.getDashboardData(filters)
      .pipe(
        catchError(err => {
          console.error('Erro ao filtrar:', err);
          this.error = 'Erro ao aplicar filtro.';

          const errorResponse: DashboardResponse = {
            success: false,
            data: [],
            statistics: {
              compliant_count: 0,
              alert_count: 0,
              critical_count: 0,
              non_compliant_count: 0,
              total_parameters: 0
            },
            last_updated: new Date().toISOString(),
            message: 'Erro ao aplicar filtro'
          };

          return of(errorResponse);
        }),
        finalize(() => {
          this.loading = false;
        })
      )
      .subscribe(response => {
        if (response.success) {
          this.parameters = response.data;
          this.atualizarEstatisticas(response.statistics);
          console.log('Filtro aplicado:', this.parameters.length, 'parâmetros encontrados');

          // Verificar consistência após filtrar
          this.verificarConsistenciaDados();
        } else {
          this.error = response.message || 'Erro ao aplicar filtro';
          this.parameters = [];
        }
      });
  }

  // Método alternativo se o endpoint de filtros não existir
  carregarDashboardData() {
    console.log('=== CARREGANDO DADOS DO DASHBOARD (método alternativo) ===');
    this.loading = true;
    this.error = null;

    const filters: any = {};
    if (this.selectedMatriz) filters.matrizId = this.selectedMatriz;
    if (this.selectedLegislacao) filters.legislacaoId = this.selectedLegislacao;

    this.dashboardService.getDashboardData(filters)
      .pipe(
        catchError(err => {
          console.error('Erro ao carregar dados:', err);
          this.error = 'Erro ao carregar dados do dashboard. Verifique a conexão.';

          const errorResponse: DashboardResponse = {
            success: false,
            data: [],
            statistics: {
              compliant_count: 0,
              alert_count: 0,
              critical_count: 0,
              non_compliant_count: 0,
              total_parameters: 0
            },
            last_updated: new Date().toISOString(),
            message: 'Erro de conexão com o servidor'
          };

          return of(errorResponse);
        }),
        finalize(() => {
          this.loading = false;
          this.lastUpdated = new Date().toLocaleString('pt-BR');
        })
      )
      .subscribe(response => {
        console.log('Resposta da API completa:', response);
        console.log('Dados brutos da API:', response.data);

        if (response.success) {
          this.parameters = response.data;
          this.atualizarEstatisticas(response.statistics);

          // Se não temos filtros carregados, extrai dos dados
          if (this.matrizes.length === 0 || this.legislacoes.length === 0) {
            this.extractFilterOptionsFromData(response.data);
          }
        } else {
          this.error = response.message || 'Erro ao carregar dados';
          this.parameters = [];
        }
      });
  }

  extractFilterOptionsFromData(data: ComplianceData[]) {
    console.log('=== EXTRACTION DE FILTROS DOS DADOS ===');

    const matrizMap = new Map<number, any>();
    const legMap = new Map<number, any>();

    data.forEach((item, index) => {
      const itemAny = item as any;

      // Para matrizes
      if (itemAny.matriz_id !== undefined && itemAny.matriz_id !== null) {
        const matrizId = itemAny.matriz_id;
        const matrizNome = item.matriz_nome || `Matriz ${matrizId}`;

        if (!matrizMap.has(matrizId)) {
          matrizMap.set(matrizId, {
            id: matrizId,
            nome: matrizNome
          });
        }
      }

      // Para legislações
      if (itemAny.legislacao_id !== undefined && itemAny.legislacao_id !== null) {
        const legisId = itemAny.legislacao_id;
        const sigla = item.legislacao_sigla || `LEG${legisId}`;
        const nomeCompleto = itemAny.legislacao_nome || sigla;

        // Remove duplicação interna
        let nomeFormatado = nomeCompleto;
        if (sigla && nomeCompleto && nomeCompleto.includes(`(${sigla})`)) {
          nomeFormatado = nomeCompleto.replace(` (${sigla})`, '').trim();
        }

        if (!legMap.has(legisId)) {
          legMap.set(legisId, {
            id: legisId,
            nome: nomeFormatado,
            sigla: sigla
          });
        }
      }
    });

    this.matrizes = Array.from(matrizMap.values());
    this.legislacoes = Array.from(legMap.values());

    console.log('Matrizes extraídas dos dados:', this.matrizes);
    console.log('Legislações extraídas dos dados:', this.legislacoes);

    // Completa com matrizes e legislações faltantes
    this.completarMatrizesFaltantes();
    this.completarLegislacoesFaltantes();
  }

  atualizarEstatisticas(stats: any) {
    this.totalParameters = stats.total_parameters || 0;
    this.compliantCount = stats.compliant_count || 0;
    this.alertCount = stats.alert_count || 0;
    this.criticalCount = stats.critical_count || 0;
    this.nonCompliantCount = stats.non_compliant_count || 0;
  }

  limparFiltros() {
    this.selectedMatriz = null;
    this.selectedLegislacao = null;
    this.filtrar();
  }

  // ========== MÉTODOS PARA O TEMPLATE ==========

  getCardStatusClass(status: string): string {
    return `status-${status}`;
  }

  getStatusBadgeClass(status: string): string {
    const map: { [key: string]: string } = {
      'conforme': 'bg-success',
      'alerta': 'bg-warning',
      'critico': 'bg-danger',
      'nao-conforme': 'bg-danger'
    };
    return map[status] || 'bg-secondary';
  }

  getStatusText(status: string): string {
    const map: { [key: string]: string } = {
      'conforme': 'Conforme',
      'alerta': 'Alerta',
      'critico': 'Crítico',
      'nao-conforme': 'Não Conforme'
    };
    return map[status] || status;
  }

  getValueClass(status: string): string {
    return `value-${status}`;
  }

  formatValue(value: any): string {
    if (value === null || value === undefined) return 'N/A';

    const num = Number(value);
    if (isNaN(num)) return String(value);

    if (Number.isInteger(num)) {
      return num.toString();
    }

    return num.toFixed(2);
  }

  getTimeAgo(dateString: string): string {
    if (!dateString) return 'N/A';

    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);

      if (diffMins < 1) return 'Agora';
      if (diffMins < 60) return `${diffMins} min atrás`;

      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours} h atrás`;

      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays} dias atrás`;
    } catch (e) {
      return 'Data inválida';
    }
  }

  getProgressWidth(param: ComplianceData): string {
    const paramAny = param as any;

    if (paramAny.porcentagem !== undefined && paramAny.porcentagem !== null) {
      const porcentagem = Math.min(100, Math.max(0, paramAny.porcentagem));
      return `${porcentagem}%`;
    }

    const valor = param.current_value || paramAny.valor_parametro || 0;
    const min = param.min_limit || paramAny.limite_minimo || 0;
    const max = param.max_limit || paramAny.limite_maximo || 1;

    if (max === min) return '50%';

    const porcentagem = ((valor - min) / (max - min)) * 100;
    const clamped = Math.min(100, Math.max(0, porcentagem));
    return `${clamped}%`;
  }

  getProgressBarClass(status: string): string {
    const map: { [key: string]: string } = {
      'conforme': 'bg-success',
      'alerta': 'bg-warning',
      'critico': 'bg-danger',
      'nao-conforme': 'bg-danger'
    };
    return map[status] || 'bg-secondary';
  }

  // Método para obter nome da matriz
  getMatrizNome(id: number): string {
    const matriz = this.matrizes.find(m => m.id === id);
    if (matriz) {
      return matriz.nome;
    }

    // Fallback: procura nos parâmetros
    const param = this.parameters.find(p => {
      const pAny = p as any;
      return pAny.matriz_id === id;
    });

    if (param) {
      const paramAny = param as any;
      return paramAny.matriz_nome || `Matriz ${id}`;
    }

    return `Matriz ${id}`;
  }

  // Método para obter nome da legislação
  getLegislacaoNome(id: number): string {
    const legis = this.legislacoes.find(l => l.id === id);
    if (legis) {
      // Remove duplicação se existir
      if (legis.sigla && legis.nome && legis.nome.includes(`(${legis.sigla})`)) {
        return legis.nome.replace(` (${legis.sigla})`, '').trim();
      }
      return legis.nome || legis.sigla || `Legislação ${id}`;
    }

    // Fallback: procura nos parâmetros
    const param = this.parameters.find(p => {
      const pAny = p as any;
      return pAny.legislacao_id === id;
    });

    if (param) {
      const paramAny = param as any;
      const sigla = param.legislacao_sigla || '';
      const nome = paramAny.legislacao_nome || sigla || `Legislação ${id}`;

      if (sigla && nome.includes(`(${sigla})`)) {
        return nome.replace(` (${sigla})`, '').trim();
      }
      return nome;
    }

    return `Legislação ${id}`;
  }

  // Método para formatar legislação no select
  formatLegislacaoForDisplay(leg: any): string {
    if (!leg) return '';

    let nome = leg.nome || '';
    const sigla = leg.sigla || '';

    // Remove duplicação se existir
    if (sigla && nome.includes(`(${sigla})`)) {
      nome = nome.replace(` (${sigla})`, '').trim();
    }

    // Se for a legislação INTERNO, mostra de forma especial
    if (sigla === 'INTERNO') {
      return nome || 'Limites Internos';
    }

    return nome || sigla;
  }

  // Método para verificar se uma matriz tem parâmetros
  matrizTemParametros(id: number): boolean {
    return this.parameters.some(p => {
      const pAny = p as any;
      return pAny.matriz_id === id;
    });
  }

  // Método para verificar se uma legislação tem parâmetros
  legislacaoTemParametros(id: number): boolean {
    return this.parameters.some(p => {
      const pAny = p as any;
      return pAny.legislacao_id === id;
    });
  }

  // Método para debug
  debugFiltros() {
    console.log('=== DEBUG FILTROS ===');
    console.log('Total matrizes:', this.matrizes.length, this.matrizes);
    console.log('Total legislações:', this.legislacoes.length, this.legislacoes);

    // Verificar se temos os 3 itens de cada
    if (this.matrizes.length < 3) {
      console.warn(`Faltam matrizes! Temos ${this.matrizes.length}, esperávamos 3.`);
    }

    if (this.legislacoes.length < 3) {
      console.warn(`Faltam legislações! Temos ${this.legislacoes.length}, esperávamos 3.`);
    }
  }
}
