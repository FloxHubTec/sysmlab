// controllers/ParametroController.js
const ParametroModel = require('../models/ParametroModel');

class ParametroController {

    /**
     * Busca todos os parâmetros com status de conformidade
     */
    static async findAll(req, res) {
        try {
            const parametros = await ParametroModel.findAll();

            // Adiciona o status de conformidade para cada parâmetro
            const parametrosComStatus = parametros.map(parametro => {
                const status = ParametroController.calcularStatusConformidade(parametro);
                return {
                    ...parametro,
                    status_conformidade: status
                };
            });

            return res.status(200).json({
                success: true,
                data: parametrosComStatus,
                count: parametrosComStatus.length
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
     * Calcula o status de conformidade baseado nos limites e valor_parametro
     */
    static calcularStatusConformidade(parametro) {
        const { valor_parametro, limite_minimo, limite_maximo } = parametro;
        
        // Converte para número para garantir comparação correta
        const valor = parseFloat(valor_parametro);
        const min = parseFloat(limite_minimo);
        const max = parseFloat(limite_maximo);

        // Verifica se os valores são válidos
        if (isNaN(valor)) {            
            return 'dados inválidos - valor';
        }
        if (isNaN(min)) {            
            return 'dados inválidos - mínimo';
        }
        if (isNaN(max)) {
            return 'dados inválidos - máximo';
        }

        // Calcula a faixa total
        // É o intervalo em que o valor pode variar sem ser considerado fora do padrão.
        const faixaTotal = max - min;

        // Define os limites para os status
        const limiteAlerta = 0.8; // 80% do limite máximo
        const limiteCritico = 0.9; // 90% do limite máximo

        // valorNormalizado mede o quão próximo o valor está dentro dos limites
        const valorNormalizado = (valor - min) / faixaTotal;

        // Verifica se está abaixo do mínimo
        if (valor < min) {            
            return 'não conforme';
        }

        // Verifica se está acima do máximo
        if (valor > max) {
            return 'não conforme';
        }

        // Verifica se está na faixa de alerta (próximo do máximo)
        if (valorNormalizado > limiteCritico) {
            return 'crítico';
        } else if (valorNormalizado > limiteAlerta) {            
            return 'alerta';
        }

        // Está dentro dos limites aceitáveis
        return 'conforme';
    }
    
}

module.exports = ParametroController;