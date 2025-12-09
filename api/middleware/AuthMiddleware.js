// middleware/authMiddleware.js
const { verificarToken } = require("../utils/jwt");

module.exports = function authMiddleware(req, res, next) {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
        return res.status(401).json({ erro: "Token não fornecido" });
    }

    try {
        const decoded = verificarToken(token); // { id, email }
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ erro: "Token inválido" });
    }
};
