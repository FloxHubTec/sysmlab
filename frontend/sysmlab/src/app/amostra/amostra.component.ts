import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, FormsModule } from '@angular/forms';

// Serviços
import { AmostraService, Amostra, MatrizOption, UsuarioOption } from './amostra.service';
// Importamos o serviço de resultados para aproveitar a lista de parâmetros existente
import { ResultadoAnaliseService, Parametro } from '../resultado-analise/resultado-analise.service';

@Component({
  selector: 'app-amostra',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './amostra.component.html',
  styleUrls: ['./amostra.component.css']
})
export class AmostraComponent implements OnInit {

  // Listas de Dados
  amostras: Amostra[] = [];
  matrizes: MatrizOption[] = [];
  usuarios: UsuarioOption[] = [];
  parametros: Parametro[] = []; // Lista para o Multi-Select

  // Controle do Formulário
  amostraForm: FormGroup;
  isEditing: boolean = false;
  editingId?: number;
  loading: boolean = false;

  // Filtro simples para a tabela
  filtroTexto: string = '';

  //dados do modal para ver o usuario e parametros no botão ver da tabela
  amostraParaVisualizacao: Amostra | null = null;

  //modal de cadastro
  mostrarModalCadastro: boolean = false;

  constructor(
    private amostraService: AmostraService,
    private resultadoService: ResultadoAnaliseService, // Para buscar os parâmetros
    private fb: FormBuilder
  ) {
    this.amostraForm = this.createForm();
  }

  ngOnInit(): void {
    this.loadAllData();
  }

  // --- CONFIGURAÇÃO DO FORMULÁRIO ---
  createForm(): FormGroup {
    return this.fb.group({
      codigo_amostra: ['', Validators.required],
      numero_da_amostra: ['', Validators.required],
      localizacao: ['', Validators.required],
      matriz_id: ['', Validators.required],
      usuario_id: ['', Validators.required], // UUID
      // Array de IDs para seleção múltipla
      parametros_ids: [[]],
      // Validação de data com máscara e lógica futura
      data_coleta: ['', [Validators.required, Validators.pattern(/^\d{2}\/\d{2}\/\d{4}$/), this.validarDataFutura]]
    });
  }

  // Método para abrir o modal em modo de novo cadastro
  abrirModalCadastro() {
    this.resetForm();
    this.mostrarModalCadastro = true;
  }

  // Método para fechar o modal
  fecharModalCadastro() {
    this.mostrarModalCadastro = false;
    this.resetForm();
  }

  // Validador personalizado para impedir datas futuras
  validarDataFutura(control: AbstractControl) {
    const valor = control.value;
    if (!valor || valor.length !== 10) return null;

    const parts = valor.split('/');
    // Mês em JS é 0-indexado (Jan=0)
    const dateInput = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Zera hora para comparar apenas data

    return dateInput > today ? { dataFutura: true } : null;
  }

  // --- CARREGAMENTO DE DADOS ---
  loadAllData(): void {
    this.loading = true;

    // Carrega todas as dependências em paralelo
    Promise.all([
      this.amostraService.findAll().toPromise(),
      this.amostraService.getMatrizes().toPromise(),
      this.amostraService.getUsuarios().toPromise(),
      this.resultadoService.getParametros().toPromise() // Reutiliza serviço existente
    ]).then(([resAmostras, resMatrizes, resUsuarios, resParametros]) => {

      this.amostras = resAmostras?.data || [];
      this.matrizes = resMatrizes?.data || [];
      this.usuarios = resUsuarios?.data || [];
      this.parametros = resParametros?.data || []; // Lista completa de parâmetros

      this.loading = false;
    }).catch(err => {
      console.error('Erro ao carregar dados:', err);
      alert('Erro ao carregar dados do servidor.');
      this.loading = false;
    });
  }

  // Apenas recarrega a tabela (útil após insert/update)
  loadAmostras(): void {
    this.loading = true;
    this.amostraService.findAll().subscribe({
      next: (res) => {
        this.amostras = res.data;
        this.loading = false;
      },
      error: () => this.loading = false
    });
  }

  // --- AÇÕES DO FORMULÁRIO ---

  onSubmit(): void {
    if (this.amostraForm.valid) {
      this.loading = true;
      const formData = this.amostraForm.value;

      // 1. Converte data dd/mm/aaaa -> ISO yyyy-mm-dd
      const parts = formData.data_coleta.split('/');
      const isoDate = `${parts[2]}-${parts[1]}-${parts[0]}`;

      // 2. Prepara objeto
      const payload: Amostra = {
        codigo_amostra: formData.codigo_amostra,
        numero_da_amostra: formData.numero_da_amostra,
        localizacao: formData.localizacao,
        matriz_id: Number(formData.matriz_id),
        usuario_id: formData.usuario_id,
        data_coleta: isoDate,
        // Garante envio como array de números
        parametros_ids: formData.parametros_ids ? formData.parametros_ids.map((id: any) => Number(id)) : []
      };

      console.log('Enviando Payload:', payload);

      // 3. Define operação
      let request;
      if (this.isEditing && this.editingId) {
        request = this.amostraService.update(this.editingId, payload);
      } else {
        request = this.amostraService.create(payload);
      }

      // 4. Executa
      request.subscribe({
        next: () => {
          alert(this.isEditing ? 'Atualizado!' : 'Cadastrado!');
          this.fecharModalCadastro(); // <--- FECHA O MODAL AQUI
          this.loadAmostras();
        },
        error: (err) => {
          console.error(err);
          const msg = err.error?.message || err.message || 'Erro desconhecido';
          alert(`Erro: ${msg}`);
          this.loading = false;
        }
      });
    } else {
      this.amostraForm.markAllAsTouched();
      alert('Verifique os campos obrigatórios.');
    }
  }

  edit(item: Amostra): void {
    this.isEditing = true;
    this.editingId = item.id;

    // Converte Data ISO -> dd/mm/aaaa
    let dataFormatada = '';
    if (item.data_coleta) {
      const dateObj = new Date(item.data_coleta);
      // Ajuste de fuso simples ou string split para garantir dia exato
      // Vamos usar split para ser seguro contra fuso como fizemos antes
      const isoParts = item.data_coleta.toString().split('T')[0].split('-');
      dataFormatada = `${isoParts[2]}/${isoParts[1]}/${isoParts[0]}`;
    }

    // Busca detalhes completos (para pegar os parametros_ids que não vêm no findAll)
    this.loading = true;
    this.amostraService.findById(item.id!).subscribe({
      next: (res) => {
        const fullData = res.data;

        this.amostraForm.patchValue({
          codigo_amostra: fullData.codigo_amostra,
          numero_da_amostra: fullData.numero_da_amostra,
          localizacao: fullData.localizacao,
          matriz_id: fullData.matriz_id,
          usuario_id: fullData.usuario_id,
          data_coleta: dataFormatada,
          // Preenche o multi-select com os IDs retornados
          parametros_ids: fullData.parametros_ids || []
        });

        this.loading = false;
        window.scrollTo({ top: 0, behavior: 'smooth' });
      },
      error: (err) => {
        console.error('Erro ao buscar detalhes:', err);
        this.loading = false;
      }
    });

    this.mostrarModalCadastro = true;
  }

  delete(id: number): void {
    if (confirm('Tem certeza que deseja excluir esta amostra?')) {
      this.loading = true;
      this.amostraService.delete(id).subscribe({
        next: () => {
          alert('Excluído com sucesso!');
          this.loadAmostras();
        },
        error: (err) => {
          const msg = err.error?.message || 'Erro ao excluir';
          alert(msg);
          this.loading = false;
        }
      });
    }
  }

  resetForm(): void {
    this.amostraForm.reset();
    this.isEditing = false;
    this.editingId = undefined;
    // Reseta o select múltiplo para vazio
    this.amostraForm.controls['parametros_ids'].setValue([]);
  }

  // Helper para máscara de data no input (opcional, igual fizemos no outro componente)
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
    this.amostraForm.get('data_coleta')?.setValue(value, { emitEvent: false });
  }

  // Getter para lista filtrada (caso queira adicionar busca na tabela)
  get amostrasFiltradas() {
    if (!this.filtroTexto) return this.amostras;
    const termo = this.filtroTexto.toLowerCase();
    return this.amostras.filter(a =>
      a.codigo_amostra.toLowerCase().includes(termo) ||
      a.numero_da_amostra.toLowerCase().includes(termo) ||
      (a.localizacao && a.localizacao.toLowerCase().includes(termo))
    );
  }

  //modal de visualização do botão ver da amostra

  visualizarAmostra(id: number): void {
    this.loading = true;
    this.amostraService.findById(id).subscribe({
      next: (res) => {
        // O backend retorna 'parametros_detalhes' e 'usuario_nome' no findById
        this.amostraParaVisualizacao = res.data;
        this.loading = false;
      },
      error: (err) => {
        console.error(err);
        alert('Erro ao carregar detalhes da amostra.');
        this.loading = false;
      }
    });
  }

  fecharVisualizacao(): void {
    this.amostraParaVisualizacao = null;
  }
}
