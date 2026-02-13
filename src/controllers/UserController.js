const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const userService = require('../services/UserService');
const userRepository = require('../repositories/UserRepository'); // Essencial para o updateAvatar
const env = require('../config/env');
const UserService = require('../services/UserService');

class UserController {
  async store(req, res) {
    try {
      const { name, email, password } = req.body;
      const avatar = req.file ? req.file.filename : null;

      const user = await userService.register({
        name,
        email,
        password,
        avatar,
      });

      const token = jwt.sign({}, env.auth.secret, {
        subject: String(user.id),
        expiresIn: env.auth.expiresIn,
      });

      return res.status(201).json({ user, token });
    } catch (error) {
      console.error("❌ ERRO NO CADASTRO:", error);
      return res.status(400).json({ error: error.message });
    }
  }

  async updateAvatar(req, res) {
    try {
      const { base64, fileExtension } = req.body;
      const userId = req.user.id;
      const user = await UserService.updateAvatar({
        userId,
        base64,
        fileExtension
      });
      return res.json({ 
        avatar: user.avatar,
        message: "Foto atualizada com sucesso!" 
      });
    } catch (error) {
      console.error("❌ Erro ao atualizar avatar:", error.message);
      return res.status(400).json({ error: error.message });
    }
  }

  async updateProfile(req, res) {
    try {
      const { name, email } = req.body;
      const userId = req.user.id;

      const user = await UserService.updateProfile({
        userId,
        name,
        email
      });

      return res.json(user);
    } catch (error) {
      console.error("❌ Erro ao atualizar perfil:", error.message);
      return res.status(400).json({ error: error.message });
    }
  }

  async updatePassword(req, res) {
  try {
    const { oldPassword, newPassword } = req.body;
    const userId = req.user.id;

    await userService.updatePassword({ userId, oldPassword, newPassword });

    return res.json({ message: "Senha atualizada com sucesso!" });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
}

  async deleteUser(req, res) {
    try {
      const userId = req.user.id;
      await userService.deleteUser(userId);
      return res.status(204).send();
    } catch (error) {
      return res.status(400).json({ error: "Erro ao excluir conta." });
    }
  }

  updateSettings = async (req, res) => {
    try {
      const userId = req.user?.id || req.user_id; 
      const newSettings = req.body;
      if (Object.keys(newSettings).length === 0) {
        return res.status(400).json({ error: 'Nenhuma configuração enviada.' });
      }
      // 3. O Repository faz o MERGE (||) no banco
      const updatedUser = await userRepository.updateSettings(userId, newSettings);
      return res.json(updatedUser);
    } catch (error) {
      console.error("Erro no updateSettings:", error.message);
      return res.status(400).json({ error: error.message });
    }
  }
}

module.exports = new UserController();