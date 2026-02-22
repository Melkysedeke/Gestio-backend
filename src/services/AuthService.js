const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const userRepository = require('../repositories/UserRepository');
const env = require('../config/env'); 

class AuthService {
  /**
   * @param {string} email
   * @param {string} password
   */
  async compare({ email, password }) {
    // 1. Verificar se o usuário existe no banco de dados
    const user = await userRepository.findByEmail(email);
    if (!user || user.deleted_at !== null) {
      throw new Error('E-mail ou senha incorretos.');
    }

    // 2. Comparar a senha
    const passwordMatched = await bcrypt.compare(password, user.password);
    if (!passwordMatched) {
      throw new Error('E-mail ou senha incorretos.');
    }

    // 3. Gerar o Token JWT
    const { secret, expiresIn } = env.auth;
    const token = jwt.sign({}, secret, {
      subject: String(user.id),
      expiresIn: expiresIn,
    });
    
    // 🚀 Extrai configurações em formato de texto para achar a carteira
    let parsedSettings = {};
    if (user.settings) {
      try { parsedSettings = JSON.parse(user.settings); } catch(e) {}
    }

    // 4. Preparar o objeto de retorno
    const userWithoutPassword = {
      id: user.id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      settings: user.settings, // Manda a string inteira pro WatermelonDB salvar
      last_opened_wallet: parsedSettings.last_opened_wallet || null,
    };

    return {
      user: userWithoutPassword,
      token,
    };
  }
}

module.exports = new AuthService();