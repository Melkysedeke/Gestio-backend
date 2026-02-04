const userRepository = require('../repositories/UserRepository');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const env = require('../config/env'); // Importa o segredo do JWT

class UserService {
  
  async register({ name, email, password, avatar }) {
    // 1. Verifica se usuário já existe
    const userExists = await userRepository.findByEmail(email);
    if (userExists) {
      throw new Error('User already exists');
    }

    // 2. Criptografa a senha
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // 3. Cria o usuário no banco
    const user = await userRepository.create({ name, email, passwordHash, avatar });

    // 4. Gera o Token
    const token = jwt.sign({ id: user.id }, env.auth.secret, { expiresIn: env.auth.expiresIn });

    return { user, token };
  }

  async login(email, password) {
    // 1. Busca usuário
    const user = await userRepository.findByEmail(email);
    if (!user) {
      throw new Error('User not found'); // Mensagem genérica por segurança
    }

    // 2. Compara senha
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new Error('Invalid password');
    }

    // 3. Gera Token
    const token = jwt.sign({ id: user.id }, env.auth.secret, { expiresIn: env.auth.expiresIn });

    return { user, token };
  }

  async updateUserSettings(userId, { lastOpenedWalletId, theme }) {
    // Prepara o objeto apenas com o que foi enviado
    const settingsToUpdate = {};
    if (lastOpenedWalletId !== undefined) settingsToUpdate.last_opened_wallet = lastOpenedWalletId;
    if (theme !== undefined) settingsToUpdate.theme = theme;

    if (Object.keys(settingsToUpdate).length > 0) {
      await userRepository.updateSettings(userId, settingsToUpdate);
    }
  }
}

module.exports = new UserService();