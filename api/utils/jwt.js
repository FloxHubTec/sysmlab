const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "changeme";

// Gera token
function gerarToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "2h" });
}

// Valida token
function verificarToken(token) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded; // { id, email }
  } catch {
    return null;
  }
}

module.exports = { gerarToken, verificarToken };
