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
    if (!user) {
      throw new Error('E-mail ou senha incorretos.');
    }

    // 2. Comparar a senha enviada (plana) com a senha do banco (hash)
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
    
    const userSettings = user.settings || {};

    // 4. Preparar o objeto de retorno
    const userWithoutPassword = {
      id: user.id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      last_opened_wallet: userSettings.last_opened_wallet || null,
    };

    return {
      user: userWithoutPassword,
      token,
    };
  }
}

module.exports = new AuthService();