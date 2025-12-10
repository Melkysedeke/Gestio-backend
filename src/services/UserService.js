// src/services/UserService.js
const userRepository = require('../repositories/UserRepository');

class UserService {
  async createUser(name, email, password, avatarUrl) {
    // 1. Verificar se usuário já existe
    const userExists = await userRepository.findByEmail(email);
    if (userExists) {
        throw new Error('Este email já está cadastrado.');
    }

    // 2. Aqui você criptografaria a senha (ex: bcrypt)
    // Por enquanto, vamos salvar direto (não recomendado para produção final)
    const passwordHash = password; // TODO: Usar bcrypt aqui

    // 3. Criar usuário
    const newUser = await userRepository.create(name, email, passwordHash, avatarUrl);
    
    return newUser;
  }
}

module.exports = new UserService();