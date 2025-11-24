// models/ResultadoAnaliseModel.js
const pool = require('../config/database');
const fs = require('fs').promises;
const path = require('path');

class ResultadoAnaliseModel {

  /**
   * Insere um novo resultado de análise
   * [LOG: CREATE]
   */
  static async create(dados) {
    let client;
    try {
      client = await pool.connect();
      await client.query('BEGIN');

      const {
        valor_medido,
        amostra_id,
        parametro_id,
        datacoleta
      } = dados;

      // 1. VALIDAÇÃO DE EXISTÊNCIA
      const amostra = await this.verificarAmostraExiste(amostra_id);
      if (!amostra) throw new Error('A amostra selecionada não existe no sistema');

      const parametro = await this.verificarParametroExiste(parametro_id);
      if (!parametro) throw new Error('O parâmetro selecionado não existe no sistema');

      // 2. VALIDAÇÃO DE CONSISTÊNCIA
      const consistenciaMatriz = await this.verificarConsistenciaMatriz(amostra_id, parametro_id);
      if (!consistenciaMatriz.consistente) {
        throw new Error(`Inconsistência de matriz: Amostra pertence a "${consistenciaMatriz.matriz_amostra}" mas parâmetro pertence a "${consistenciaMatriz.matriz_parametro}"`);
      }

      // 3. VALIDAÇÕES DE VALOR E DATA
      const valor = parseFloat(valor_medido);
      if (isNaN(valor) || valor < 0) throw new Error('valor_medido deve ser um número válido e positivo');

      if (datacoleta && new Date(datacoleta) > new Date()) {
        throw new Error('datacoleta não pode ser uma data futura');
      }

      // 4. PREPARAÇÃO DOS DADOS (Texto)
      const datadapublicacao = new Date().toISOString();
      const codigoDaAmostra = amostra.codigo_amostra;
      const numeroDaAmostra = amostra.numero_da_amostra;
      const nomeMatriz = amostra.matriz_nome;
      const infoLegislacao = `${parametro.legislacao_nome} (${parametro.legislacao_sigla})`;

      const query = `
        INSERT INTO resultado_analise 
        (
          valor_medido, amostra_id, parametro_id, datacoleta, datadapublicacao,
          codigodaamostra, numerodaamostra, matriz, legislacao
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `;

      const values = [
        valor, amostra_id, parametro_id, datacoleta || new Date(), datadapublicacao,
        codigoDaAmostra, numeroDaAmostra, nomeMatriz, infoLegislacao
      ];

      const result = await client.query(query, values);
      await client.query('COMMIT');

      // LOG DE CRIAÇÃO
      await this.logOperation('CREATE', { id: result.rows[0].id, dados_inseridos: dados });

      return result.rows[0];

    } catch (error) {
      if (client) await client.query('ROLLBACK');
      console.error('Erro ao criar:', error);
      await this.logOperation('CREATE_ERROR', { error: error.message, dados });
      throw error;
    } finally {
      if (client) client.release();
    }
  }

  /**
   * Atualiza um resultado existente
   * [LOG: UPDATE]
   */
  static async update(id, dados) {
    let client;
    try {
      client = await pool.connect();
      await client.query('BEGIN');

      const {
        valor_medido,
        amostra_id,
        parametro_id,
        datacoleta,
        matriz_id_selecionada,
        legislacao_id_selecionada
      } = dados;

      // 1. Buscas e Validações
      const amostra = await this.verificarAmostraExiste(amostra_id);
      if (!amostra) throw new Error('A amostra informada não existe');

      const parametro = await this.verificarParametroExiste(parametro_id);
      if (!parametro) throw new Error('O parâmetro informado não existe');

      // Validação de Consistência (Opcional, mantida por segurança)
      const consistenciaMatriz = await this.verificarConsistenciaMatriz(amostra_id, parametro_id);
      /* if (!consistenciaMatriz.consistente) ... */

      // 2. Decisão dos nomes (Manual vs Automático)
      let nomeMatrizFinal = amostra.matriz_nome;
      if (matriz_id_selecionada && Number(matriz_id_selecionada) > 0) {
        const resMatriz = await client.query('SELECT nome FROM matriz WHERE id = $1', [matriz_id_selecionada]);
        if (resMatriz.rowCount > 0) nomeMatrizFinal = resMatriz.rows[0].nome;
      }

      let infoLegislacaoFinal = `${parametro.legislacao_nome} (${parametro.legislacao_sigla})`;
      if (legislacao_id_selecionada && Number(legislacao_id_selecionada) > 0) {
        const resLegis = await client.query('SELECT nome, sigla FROM legislacao WHERE id = $1', [legislacao_id_selecionada]);
        if (resLegis.rowCount > 0) infoLegislacaoFinal = `${resLegis.rows[0].nome} (${resLegis.rows[0].sigla})`;
      }

      // 3. Preparação
      const codigoDaAmostra = amostra.codigo_amostra;
      const numeroDaAmostra = amostra.numero_da_amostra;
      const datadapublicacao = new Date().toISOString();

      // 4. Update
      const query = `
        UPDATE resultado_analise
        SET 
          valor_medido = $1,
          amostra_id = $2,
          parametro_id = $3,
          datacoleta = $4,
          datadapublicacao = $5,
          codigodaamostra = $6,
          numerodaamostra = $7,
          matriz = $8,
          legislacao = $9
        WHERE id = $10
        RETURNING *;
      `;

      const values = [
        parseFloat(valor_medido), amostra_id, parametro_id, datacoleta, datadapublicacao,
        codigoDaAmostra, numeroDaAmostra, nomeMatrizFinal, infoLegislacaoFinal, id
      ];

      const result = await client.query(query, values);
      await client.query('COMMIT');

      // LOG DE ATUALIZAÇÃO
      await this.logOperation('UPDATE', { id: id, dados_novos: result.rows[0] });

      return result.rows[0];

    } catch (error) {
      if (client) await client.query('ROLLBACK');
      console.error('[UPDATE ERROR]', error);
      await this.logOperation('UPDATE_ERROR', { id, error: error.message });
      throw error;
    } finally {
      if (client) client.release();
    }
  }

  /**
   * Exclui um resultado
   * [LOG: DELETE]
   */
  static async delete(id) {
    let client;
    try {
      client = await pool.connect();
      await client.query('BEGIN');

      const query = 'DELETE FROM resultado_analise WHERE id = $1 RETURNING id';
      const result = await client.query(query, [id]);

      await client.query('COMMIT');

      const wasDeleted = result.rowCount > 0;

      // LOG DE DELEÇÃO
      if (wasDeleted) {
        await this.logOperation('DELETE', { id });
      } else {
        await this.logOperation('DELETE_NOT_FOUND', { id });
      }

      return wasDeleted;

    } catch (error) {
      if (client) await client.query('ROLLBACK');
      console.error('Erro ao excluir:', error);
      await this.logOperation('DELETE_ERROR', { error: error.message, id });
      throw error;
    } finally {
      if (client) client.release();
    }
  }

  /**
   * Busca todos os resultados
   * [LOG: READ_ALL]
   */
  static async findAll() {
    try {
      const query = `
        SELECT 
          ra.*,
          -- Campos de Texto Persistidos
          ra.matriz, ra.legislacao, ra.codigodaamostra, ra.numerodaamostra,
          -- Dados Relacionais
          a.codigo_amostra as amostra_codigo_join,
          a.numero_da_amostra as amostra_numero_join,
          a.localizacao,
          m_amostra.nome as matriz_nome,
          p.nome as parametro_nome, p.unidade_medida,
          l.sigla as legislacao_sigla, l.nome as legislacao_nome
        FROM resultado_analise ra
        INNER JOIN amostra a ON ra.amostra_id = a.id
        INNER JOIN matriz m_amostra ON a.matriz_id = m_amostra.id
        INNER JOIN parametro p ON ra.parametro_id = p.id
        INNER JOIN legislacao l ON p.legislacao_id = l.id
        ORDER BY ra.created_at DESC
      `;
      const result = await pool.query(query);

      // LOG DE LEITURA (LISTAGEM)
      await this.logOperation('READ_ALL', { count: result.rows.length });

      return result.rows;
    } catch (error) {
      console.error('Erro ao buscar resultados:', error);
      await this.logOperation('READ_ALL_ERROR', { error: error.message });
      throw error;
    }
  }

  /**
   * Busca um resultado por ID
   * [LOG: READ_ONE] -> Adicionado agora!
   */
  static async findById(id) {
    try {
      const query = `
        SELECT 
          ra.*,
          ra.matriz, ra.legislacao,
          a.codigo_amostra, a.numero_da_amostra,
          m.nome as matriz_nome,
          p.nome as parametro_nome, p.unidade_medida,
          l.nome as legislacao_nome
        FROM resultado_analise ra
        INNER JOIN amostra a ON ra.amostra_id = a.id
        INNER JOIN matriz m ON a.matriz_id = m.id
        INNER JOIN parametro p ON ra.parametro_id = p.id
        INNER JOIN legislacao l ON p.legislacao_id = l.id
        WHERE ra.id = $1
      `;
      const result = await pool.query(query, [id]);

      const found = !!result.rows[0];

      // LOG DE LEITURA DE ITEM ÚNICO
      await this.logOperation('READ_ONE', { id, found });

      return result.rows[0];
    } catch (error) {
      console.error('Erro ao buscar por ID:', error);
      await this.logOperation('READ_ONE_ERROR', { id, error: error.message });
      throw error;
    }
  }

  // --- MÉTODOS AUXILIARES DE DROPDOWN (Também logados agora) ---

  static async findAmostras() {
    try {
      const res = await pool.query(`SELECT a.id, a.codigo_amostra, a.numero_da_amostra, m.nome as matriz_nome, m.id as matriz_id FROM amostra a INNER JOIN matriz m ON a.matriz_id = m.id ORDER BY a.codigo_amostra ASC`);
      await this.logOperation('READ_DROPDOWN_AMOSTRAS', { count: res.rowCount });
      return res.rows;
    } catch (e) {
      await this.logOperation('READ_DROPDOWN_ERROR', { context: 'amostras', error: e.message });
      throw e;
    }
  }

  static async findParametros() {
    try {
      const res = await pool.query(`SELECT p.id, p.nome, p.unidade_medida, p.limite_minimo, p.limite_maximo, m.id as matriz_id, l.id as legislacao_id FROM parametro p INNER JOIN legislacao l ON p.legislacao_id = l.id INNER JOIN matriz m ON p.matriz_id = m.id ORDER BY p.nome ASC`);
      await this.logOperation('READ_DROPDOWN_PARAMETROS', { count: res.rowCount });
      return res.rows;
    } catch (e) {
      await this.logOperation('READ_DROPDOWN_ERROR', { context: 'parametros', error: e.message });
      throw e;
    }
  }

  static async findMatrizes() {
    try {
      const res = await pool.query(`SELECT id, nome FROM matriz ORDER BY nome ASC`);
      await this.logOperation('READ_DROPDOWN_MATRIZES', { count: res.rowCount });
      return res.rows;
    } catch (e) { throw e; }
  }

  static async findLegislacoes() {
    try {
      const res = await pool.query(`SELECT id, nome, sigla FROM legislacao ORDER BY nome ASC`);
      await this.logOperation('READ_DROPDOWN_LEGISLACOES', { count: res.rowCount });
      return res.rows;
    } catch (e) { throw e; }
  }

  // --- VERIFICAÇÕES INTERNAS (Sem log para não poluir, pois são chamadas pelo create/update) ---

  static async verificarAmostraExiste(amostra_id) {
    const query = `SELECT a.id, a.codigo_amostra, a.numero_da_amostra, m.id as matriz_id, m.nome as matriz_nome FROM amostra a INNER JOIN matriz m ON a.matriz_id = m.id WHERE a.id = $1`;
    const result = await pool.query(query, [amostra_id]);
    return result.rows[0] || null;
  }

  static async verificarParametroExiste(parametro_id) {
    const query = `SELECT p.id, p.nome, p.unidade_medida, p.limite_minimo, p.limite_maximo, m.id as matriz_id, m.nome as matriz_nome, l.id as legislacao_id, l.nome as legislacao_nome, l.sigla as legislacao_sigla FROM parametro p INNER JOIN matriz m ON p.matriz_id = m.id INNER JOIN legislacao l ON p.legislacao_id = l.id WHERE p.id = $1`;
    const result = await pool.query(query, [parametro_id]);
    return result.rows[0] || null;
  }

  static async verificarConsistenciaMatriz(amostra_id, parametro_id) {
    const query = `SELECT am.matriz_id as matriz_amostra_id, am.matriz_nome as matriz_amostra, pm.matriz_id as matriz_parametro_id, pm.matriz_nome as matriz_parametro, (am.matriz_id = pm.matriz_id) as consistente FROM (SELECT m.id as matriz_id, m.nome as matriz_nome FROM amostra a INNER JOIN matriz m ON a.matriz_id = m.id WHERE a.id = $1) am, (SELECT m.id as matriz_id, m.nome as matriz_nome FROM parametro p INNER JOIN matriz m ON p.matriz_id = m.id WHERE p.id = $2) pm`;
    const result = await pool.query(query, [amostra_id, parametro_id]);
    return result.rows[0] || { consistente: false };
  }

  /**
   * Sistema de Logs em Arquivo
   */
  static async logOperation(operation, data) {
    try {
      const logEntry = {
        timestamp: new Date().toISOString(),
        operation,
        data
      };

      const logDir = path.join(__dirname, '../logs');
      const logFile = path.join(logDir, 'resultado_analise.log');

      await fs.mkdir(logDir, { recursive: true });
      await fs.appendFile(logFile, JSON.stringify(logEntry) + '\n');
    } catch (error) {
      console.error('Erro ao gravar log:', error);
    }
  }
}

module.exports = ResultadoAnaliseModel;