module.exports = function roleMiddleware(...rolesPermitidos) {
  return (req, res, next) => {

    if (!req.user) {
      return res.status(401).json({ erro: "Usuário não autenticado" });
    }

    if (!rolesPermitidos.includes(req.user.perfil)) {
      return res.status(403).json({ erro: "Acesso negado" });
    }

    next();
  };
};
