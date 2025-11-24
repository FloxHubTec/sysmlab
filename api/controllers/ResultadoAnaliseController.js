// controllers/ResultadoAnaliseController.js
const ResultadoAnaliseModel = require('../models/ResultadoAnaliseModel');

class ResultadoAnaliseController {

  /**
   * Busca todos os resultados de análise
   */
  static async findAll(req, res) {
    try {
      const resultados = await ResultadoAnaliseModel.findAll();

      return res.status(200).json({
        success: true,
        data: resultados,
        count: resultados.length
      });

    } catch (error) {
      console.error('Erro no controller ao buscar resultados de análise:', error);
      return res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      });
    }
  }

  /**
   * Cria um novo resultado de análise - COM VALIDAÇÃO DE MATRIZ
   */
  static async create(req, res) {
    try {
      const {
        valor_medido,
        amostra_id,
        parametro_id,
        datacoleta
      } = req.body;

      const novoResultado = await ResultadoAnaliseModel.create({
        valor_medido,
        amostra_id,
        parametro_id,
        datacoleta
      });

      return res.status(201).json({
        success: true,
        message: 'Resultado de análise criado com sucesso',
        data: novoResultado
      });

    } catch (error) {
      console.error('Erro no controller ao criar resultado de análise:', error);

      // Tratamento específico para erro de consistência de matriz
      if (error.message.includes('Inconsistência de matriz')) {
        return res.status(422).json({ // 422 Unprocessable Entity
          success: false,
          message: error.message,
          error: 'Erro de consistência de dados'
        });
      }

      return res.status(400).json({
        success: false,
        message: error.message,
        error: 'Erro de validação'
      });
    }
  }

  /**
   * Busca amostras para dropdown
   */
  static async findAmostras(req, res) {
    try {
      const amostras = await ResultadoAnaliseModel.findAmostras();

      return res.status(200).json({
        success: true,
        data: amostras,
        count: amostras.length
      });

    } catch (error) {
      console.error('Erro no controller ao buscar amostras:', error);
      return res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      });
    }
  }

  /**
   * Busca parâmetros para dropdown
   */
  static async findParametros(req, res) {
    try {
      const parametros = await ResultadoAnaliseModel.findParametros();

      return res.status(200).json({
        success: true,
        data: parametros,
        count: parametros.length
      });

    } catch (error) {
      console.error('Erro no controller ao buscar parâmetros:', error);
      return res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      });
    }
  }

  /**
   * Busca matrizes para dropdown
   */
  static async findMatrizes(req, res) {
    try {
      const matrizes = await ResultadoAnaliseModel.findMatrizes();

      return res.status(200).json({
        success: true,
        data: matrizes,
        count: matrizes.length
      });

    } catch (error) {
      console.error('Erro no controller ao buscar matrizes:', error);
      return res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      });
    }
  }

  /**
   * Busca legislações para dropdown
   */
  static async findLegislacoes(req, res) {
    try {
      const legislacoes = await ResultadoAnaliseModel.findLegislacoes();

      return res.status(200).json({
        success: true,
        data: legislacoes,
        count: legislacoes.length
      });

    } catch (error) {
      console.error('Erro no controller ao buscar legislações:', error);
      return res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      });
    }
  }

  /**
   * Busca um resultado por ID
   */
  static async findById(req, res) {
    try {
      const { id } = req.params;
      const resultado = await ResultadoAnaliseModel.findById(id);

      if (!resultado) {
        return res.status(404).json({
          success: false,
          message: 'Resultado de análise não encontrado'
        });
      }

      return res.status(200).json({
        success: true,
        data: resultado
      });

    } catch (error) {
      console.error('Erro no controller ao buscar resultado de análise:', error);
      return res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      });
    }
  }

  /**
   * Atualiza um resultado de análise - COM VALIDAÇÃO DE MATRIZ
   */
  static async update(req, res) {
    try {
      const { id } = req.params;

      // 1. AQUI ESTAVA O BLOQUEIO: Adicionamos os campos novos na extração
      const {
        valor_medido,
        amostra_id,
        parametro_id,
        datacoleta,
        matriz_id_selecionada,      // <--- NOVO: Pega o ID da matriz manual
        legislacao_id_selecionada   // <--- NOVO: Pega o ID da legislação manual
      } = req.body;

      // 2. Passamos os campos novos para o Model
      const resultadoAtualizado = await ResultadoAnaliseModel.update(id, {
        valor_medido,
        amostra_id,
        parametro_id,
        datacoleta,
        matriz_id_selecionada,      // <--- Envia para o Model processar
        legislacao_id_selecionada   // <--- Envia para o Model processar
      });

      if (!resultadoAtualizado) {
        return res.status(404).json({
          success: false,
          message: 'Resultado de análise não encontrado'
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Resultado de análise atualizado com sucesso',
        data: resultadoAtualizado
      });

    } catch (error) {
      console.error('Erro no controller ao atualizar resultado de análise:', error);

      if (error.message.includes('Inconsistência de matriz')) {
        return res.status(422).json({
          success: false,
          message: error.message,
          error: 'Erro de consistência de dados'
        });
      }

      return res.status(400).json({
        success: false,
        message: error.message,
        error: 'Erro de validação'
      });
    }
  }

  /**
   * Exclui um resultado de análise
   */
  static async delete(req, res) {
    try {
      const { id } = req.params;
      const deletado = await ResultadoAnaliseModel.delete(id);

      if (!deletado) {
        return res.status(404).json({
          success: false,
          message: 'Resultado de análise não encontrado'
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Resultado de análise excluído com sucesso'
      });

    } catch (error) {
      console.error('Erro no controller ao excluir resultado de análise:', error);
      return res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      });
    }
  }
}

module.exports = ResultadoAnaliseController;