// models/ParametroModel.js
const pool = require('../config/database');

class ParametroModel {

  /**
   * Busca todos os parâmetros
   */
  static async findAll() {
    try {
      const query = `
        SELECT 
          p.id,
          p.nome,
          p.unidade_medida,
          p.valor_parametro,
          p.limite_minimo,
          p.limite_maximo,
          p.legislacao_id,
          p.matriz_id,
          p.created_at,
          m.nome AS matriz_nome,
          l.sigla AS legislacao_sigla,
          l.nome AS legislacao_nome
        FROM parametro p
        LEFT JOIN matriz m ON p.matriz_id = m.id
        LEFT JOIN legislacao l ON p.legislacao_id = l.id
        WHERE p.valor_parametro IS NOT NULL
        ORDER BY p.nome ASC
      `;
      const result = await pool.query(query);
      return result.rows;
    } catch (error) {
      console.error('Erro ao buscar parâmetros:', error);
      throw new Error(`Erro ao buscar parâmetros: ${error.message}`);
    }
  }


}

module.exports = ParametroModel;