// models/GraficoParametroModel.js
const pool = require('../config/database');

class GraficoParametroModel {

  static async getDadosGrafico() {
    try {
      // Seleciona o nome e o valor de referência do parâmetro
      // O DISTINCT garante que cada parâmetro apareça apenas uma vez no gráfico
      const query = `
        SELECT DISTINCT
          p.nome as parametro,
          p.valor_parametro
        FROM parametro p
        INNER JOIN resultado_analise ra ON ra.parametro_id = p.id
        WHERE p.valor_parametro IS NOT NULL -- Traz apenas os que têm valor de referência definido
        ORDER BY p.nome ASC
      `;
      
      const result = await pool.query(query);
      return result.rows;

    } catch (error) {
      console.error('Erro no GraficoParametroModel:', error);
      throw new Error(`Erro ao buscar dados: ${error.message}`);
    }
  }
}

module.exports = GraficoParametroModel;