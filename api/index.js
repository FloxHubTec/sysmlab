const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors'); 
const parametroRoutes = require('./routes/ParametroRoutes');
const resultadoAnaliseRoutes = require('./routes/ResultadoAnaliseRoutes'); 
const graficoParametrosRoutes = require('./routes/GraficoParametroRoutes');
const alertasRoutes = require('./routes/AlertaRoutes');
const dashboardWebRoutes = require('./routes/DashboardWebRoutes');
const amostraRoutes = require('./routes/AmostraRoutes');

const authRoutes = require('./routes/AuthRoutes')
const app = express();
// const authMiddleware = require("./middlewares/authMiddleware");

// Carrega variáveis de ambiente do arquivo .env
dotenv.config();

// Configurações
const PORT = process.env.PORT || 3000; 
const ENV = process.env.NODE_ENV || 'development';

// Middleware
app.use(express.json());
app.use(cors());

//rota de login
app.use('',authRoutes);

// Rotas
app.use('/dashboardtv', parametroRoutes);
app.use('/resultados-analise', resultadoAnaliseRoutes); 

// Rota 404 - Para endpoints não encontrados
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        error: 'Endpoint não encontrado',
        path: req.originalUrl        
    });
});

// Middleware de erro global
app.use((error, req, res, next) => {
    console.error('Erro global não tratado:', error);
    res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        ...(ENV === 'development' && { detail: error.message })
    });
});

// Inicializar servidor
app.listen(PORT, () => {
    console.log(`Servidor CAERN iniciado com sucesso!`);
    console.log(`URL: http://localhost:${PORT}`);
    console.log(`Ambiente: ${ENV}`);  
});

// Exporta apenas o app (não precisa mais exportar pool)
module.exports = app;