const db = require('../database/index');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const fs = require('fs');
const path = require('path');
const User = require('../models/UserModel');

class UserController {
  // Retorna os dados do usuário logado (Utilizado na rota /me)
  async show(req, res) {
    try {
      const result = await db.query(
        'SELECT id, name, email, avatar, settings FROM users WHERE id = $1',
        [req.userId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }

      const user = result.rows[0];
      return res.json({
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar ? `${env.app.url}/uploads/${user.avatar}` : null,
        settings: user.settings
      });
    } catch (error) {
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  // Criar novo usuário
  async create(req, res) {
    const { name, email, password } = req.body;
    const avatar = req.file ? req.file.filename : null;

    try {
      const userExists = await db.query('SELECT id FROM users WHERE email = $1', [email]);
      
      if (userExists.rows.length > 0) {
        if (avatar) this.deleteFile(avatar);
        return res.status(400).json({ error: 'User already exists' });
      }

      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);
      const defaultSettings = { theme: 'light', last_opened_wallet: null };

      const result = await db.query(
        `INSERT INTO users (name, email, password, avatar, settings) 
         VALUES ($1, $2, $3, $4, $5) 
         RETURNING *`,
        [name, email, passwordHash, avatar, JSON.stringify(defaultSettings)]
      );

      const user = new User(result.rows[0]);
      const token = jwt.sign({ id: user.id }, env.auth.secret, { expiresIn: '30d' });

      return res.status(201).json({
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          avatar: avatar ? `${env.app.url}/uploads/${avatar}` : null,
          theme: 'light',
          last_opened_wallet: null
        },
        token
      });

    } catch (error) {
      if (avatar) this.deleteFile(avatar);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  // Autenticar usuário
  async login(req, res) {
    const { email, password } = req.body;

    try {
      const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
      if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });

      const user = new User(result.rows[0]);
      const isMatch = await bcrypt.compare(password, user.password);

      if (!isMatch) return res.status(401).json({ error: 'Invalid password' });

      const token = jwt.sign({ id: user.id }, env.auth.secret, { expiresIn: '30d' });
      const { theme, last_opened_wallet } = user.settings || {};

      return res.json({
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          avatar: user.avatar ? `${env.app.url}/uploads/${user.avatar}` : null,
          last_opened_wallet: last_opened_wallet || null,
          theme: theme || 'light',
        },
        token
      });
    } catch (error) {
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  // Atualizar imagem
  updateAvatar = async (req, res) => {
    try {
      const { base64, fileExtension } = req.body;
      const userId = req.userId;

      if (!base64) return res.status(400).json({ error: "Imagem não fornecida" });

      const fileName = `${Date.now()}-${userId}.${fileExtension || 'jpg'}`;
      const base64Data = base64.replace(/^data:image\/\w+;base64,/, "");
      const uploadsDir = path.resolve(__dirname, '..', '..', 'uploads');
      const filePath = path.join(uploadsDir, fileName);

      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      const userResult = await db.query('SELECT avatar FROM users WHERE id = $1', [userId]);
      const oldAvatar = userResult.rows[0]?.avatar;

      fs.writeFileSync(filePath, base64Data, 'base64');

      if (oldAvatar) {
        this.deleteFile(oldAvatar);
      }

      await db.query('UPDATE users SET avatar = $1, updated_at = NOW() WHERE id = $2', [fileName, userId]);

      return res.json({ 
        message: "Avatar atualizado!",
        avatar: fileName 
      });
    } catch (error) {
      console.error("❌ ERRO NO UPLOAD:", error);
      return res.status(500).json({ error: "Erro ao processar imagem: " + error.message });
    }
  }

  deleteFile = (filename) => {
    if (!filename) return;
    const filePath = path.resolve(__dirname, '..', '..', 'uploads', filename);
    if (fs.existsSync(filePath)) {
      fs.unlink(filePath, (err) => {
        if (err) console.error('Erro ao deletar arquivo físico:', err);
      });
    }
  }

  // Atualizar Dados Pessoais
  updateProfile = async (req, res) => {
    const { name, email } = req.body;
    const userId = req.userId;

    try {
      // Validação de e-mail duplicado
      if (email) {
        const emailCheck = await db.query(
          'SELECT id FROM users WHERE email = $1 AND id != $2', 
          [email, userId]
        );
        if (emailCheck.rows.length > 0) {
          return res.status(400).json({ error: 'Este e-mail já está em uso por outro usuário.' });
        }
      }

      const result = await db.query(
        `UPDATE users 
        SET name = COALESCE($1, name), 
            email = COALESCE($2, email), 
            updated_at = NOW() 
        WHERE id = $3 
        RETURNING id, name, email, avatar`,
        [name, email, userId]
      );

      return res.json(result.rows[0]);
    } catch (error) {
      console.error("Erro no UpdateProfile:", error);
      return res.status(500).json({ error: 'Erro interno ao atualizar dados.' });
    }
  }

  // Atualizar Configurações
  async updateSettings(req, res) {
    const userId = req.userId;
    const { lastOpenedWalletId, theme } = req.body;
    
    const newSettings = {};
    if (lastOpenedWalletId !== undefined) newSettings.last_opened_wallet = lastOpenedWalletId;
    if (theme !== undefined) newSettings.theme = theme;

    try {
      await db.query(
        `UPDATE users SET settings = settings || $1::jsonb, updated_at = NOW() WHERE id = $2`,
        [JSON.stringify(newSettings), userId]
      );
      return res.status(200).send();
    } catch (error) {
      return res.status(500).json({ error: 'Erro ao atualizar configurações' });
    }
  }

  updatePassword = async (req, res) => {
    const { oldPassword, newPassword } = req.body;
    const userId = req.userId;

    try {
      // 1. Busca a senha atual no banco
      const result = await db.query('SELECT password FROM users WHERE id = $1', [userId]);
      const user = result.rows[0];

      // 2. Compara com a senha antiga enviada
      const isMatch = await bcrypt.compare(oldPassword, user.password);
      if (!isMatch) {
        return res.status(401).json({ error: 'A senha atual está incorreta.' });
      }

      // 3. Criptografa a nova senha
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(newPassword, salt);

      // 4. Atualiza no banco
      await db.query('UPDATE users SET password = $1, updated_at = NOW() WHERE id = $2', [passwordHash, userId]);

      return res.json({ message: 'Senha atualizada com sucesso!' });
    } catch (error) {
      return res.status(500).json({ error: 'Erro ao atualizar senha.' });
    }
  }

  // Deletar o usuário
  deleteAccount = async (req, res) => {
    const userId = req.userId;
    try {
      const userResult = await db.query('SELECT avatar FROM users WHERE id = $1', [userId]);
      const avatar = userResult.rows[0]?.avatar;
      await db.query('DELETE FROM users WHERE id = $1', [userId]);
      if (avatar) {
        this.deleteFile(avatar);
      }

      return res.json({ message: 'Conta excluída com sucesso.' });
    } catch (error) {
      console.error("ERRO AO EXCLUIR CONTA:", error);
      return res.status(500).json({ error: 'Erro interno no servidor ao excluir.' });
    }
  }
}

module.exports = new UserController();