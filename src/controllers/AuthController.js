const authService = require('../services/AuthService');

class AuthController {
  
  // O método que a rota /signin vai chamar
  signin = async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: 'E-mail e senha são obrigatórios.' });
      }

      const result = await authService.compare({ email, password });

      return res.json(result);
      
    } catch (error) {
      console.error('❌ Erro no login:', error.message);
      
      // Se o erro for de senha/email, retornamos 401 (Não autorizado)
      // Se for outro erro, o front recebe a mensagem tratada
      return res.status(401).json({ 
        error: error.message || 'Falha na autenticação' 
      });
    }
  }
}

module.exports = new AuthController();