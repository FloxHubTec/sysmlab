const User = require("../models/UserModel");
const bcrypt = require("bcrypt");
const { gerarToken } = require("../utils/jwt");
const supabase = require("../config/supabase");

module.exports = {

  // ✅ CADASTRO DE USUÁRIO (SUPABASE AUTH + TABELA USUARIO)
  async registrar(req, res) {
    try {
      const { nome, email, senha, perfil, telefone } = req.body;

      if (!senha || senha.length < 8) {
        return res.status(400).json({
          erro: "A senha deve ter no mínimo 8 caracteres"
        });
      }

      const existente = await User.buscarPorEmail(email);
      if (existente) {
        return res.status(400).json({ erro: "Email já cadastrado" });
      }

      // ✅ 1. CRIA NO AUTH DO SUPABASE (EMAIL + RECUPERAÇÃO)
      const { data, error } = await supabase.auth.admin.createUser({
        email,
        password: senha,
        email_confirm: true
      });

      if (error) {
        return res.status(400).json({ erro: error.message });
      }

      const supabaseUserId = data.user.id;

      // ✅ 2. CRIPTOGRAFA A SENHA PRA SUA TABELA
      const senhaHash = await bcrypt.hash(senha, 10);

      // ✅ 3. SALVA NA SUA TABELA USUARIO
      const usuario = await User.criarUsuario(
        supabaseUserId,   // <<< ID vem do Supabase
        nome,
        email,
        senhaHash,
        perfil || "usuario",
        telefone || null
      );

      const token = gerarToken({ id: usuario.id, email });

      return res.status(201).json({
        usuario,
        token
      });

    } catch (err) {
      console.error(err);
      return res.status(500).json({ erro: "Erro interno ao cadastrar usuário" });
    }
  },

  // ✅ LOGIN NORMAL (SUA API + JWT)
  async login(req, res) {
    try {
      const { email, senha } = req.body;

      const usuario = await User.buscarPorEmail(email);
      if (!usuario) {
        return res.status(400).json({ erro: "Credenciais inválidas" });
      }

      const senhaConfere = await bcrypt.compare(senha, usuario.senha_hash);
      if (!senhaConfere) {
        return res.status(400).json({ erro: "Credenciais inválidas" });
      }

      await User.atualizarUltimoAcesso(usuario.id);

      const token = gerarToken({ id: usuario.id, email });

      return res.json({
        usuario: {
          id: usuario.id,
          nome: usuario.nome,
          email: usuario.email,
          perfil: usuario.perfil,
          telefone: usuario.telefone,
        },
        token,
      });

    } catch (err) {
      console.error(err);
      return res.status(500).json({ erro: "Erro interno no login" });
    }
  },

};
