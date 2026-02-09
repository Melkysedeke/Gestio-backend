// src/services/UserService.js
const userRepository = require('../repositories/UserRepository');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

class UserService {
  async register({ name, email, password, avatar }) {
    const userExists = await userRepository.findByEmail(email);
    if (userExists) {
      throw new Error('Usuário já existe!');
    }
    const passwordHash = await bcrypt.hash(password, 8);
    const user = await userRepository.create({
      name,
      email,
      password: passwordHash,
      avatar,
    });
    return user;
  }

  async updateAvatar({ userId, base64, fileExtension }) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new Error('Usuário não encontrado.');
    }
    if (user.avatar) {
      const oldAvatarPath = path.resolve(__dirname, '..', '..', 'uploads', user.avatar);
      if (fs.existsSync(oldAvatarPath)) {
        await fs.promises.unlink(oldAvatarPath);
      }
    }
    const fileName = `${crypto.randomBytes(10).toString('hex')}-${userId}.${fileExtension || 'jpg'}`;
    const uploadPath = path.resolve(__dirname, '..', '..', 'uploads', fileName);
    const buffer = Buffer.from(base64, 'base64');
    await fs.promises.writeFile(uploadPath, buffer);
    const updatedUser = await userRepository.updateAvatar(userId, fileName);
    return updatedUser;
  }

  async updateProfile({ userId, name, email }) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new Error('Usuário não encontrado.');
    }
    if (name === user.name && email === user.email) {
      throw new Error('Não houve alteração nos dados.');
    }
    if (email !== user.email) {
      const userWithUpdatedEmail = await userRepository.findByEmail(email);
      if (userWithUpdatedEmail && userWithUpdatedEmail.id !== userId) {
        throw new Error('Este e-mail já está em uso por outro usuário.');
      }
    }
    const updatedUser = await userRepository.updateProfile(userId, { name, email });
    return updatedUser;
  }

  async updatePassword({ userId, oldPassword, newPassword }) {
    const user = await userRepository.findById(userId);
    if (!user) throw new Error('Usuário não encontrado.');
    const passwordMatched = await bcrypt.compare(oldPassword, user.password);
    if (!passwordMatched) {
      throw new Error('A senha atual está incorreta.');
    }
    if (oldPassword === newPassword) {
      throw new Error('A nova senha deve ser diferente da atual.');
    }
    const hashedNewPassword = await bcrypt.hash(newPassword, 8);
    await userRepository.updatePassword(userId, hashedNewPassword);
  }

  async deleteUser(userId) {
    const user = await userRepository.deleteUser(userId);
    if (user && user.avatar) {
      const filePath = path.resolve(__dirname, '..', '..', 'uploads', user.avatar);
      if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath);
      }
    }
  }
}

module.exports = new UserService();