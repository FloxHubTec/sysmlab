const express = require("express");
const router = express.Router();
const AuthController = require("../controllers/AuthController");
const RoleMiddleware = require("../middleware/RoleMiddleware");

router.post("/login", AuthController.login);
router.post("/cadastro-usuario",RoleMiddleware("Gestor") ,AuthController.registrar)

module.exports = router;
