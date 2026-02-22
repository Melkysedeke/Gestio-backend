const db = require('../database/index');
const crypto = require('crypto'); // 🚀 Importado para gerar o ID em texto

class UserRepository {
  async findByEmail(email) {
    const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    return result.rows[0];
  }

  async findById(id) {
    const result = await db.query('SELECT * FROM users WHERE id = $1', [id]);
    return result.rows[0];
  }

  async create({ name, email, password, avatar }) {
    const id = crypto.randomUUID(); // 🚀 1. Gera o ID universal (ex: a1b2c3-...)
    
    // 2. Cria as configurações padrão já em formato de Texto (String)
    const defaultSettings = JSON.stringify({ 
      theme: 'light', 
      notifications: false, 
      last_opened_wallet: null 
    });

    const result = await db.query(
      `INSERT INTO users (id, name, email, password, avatar, settings, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
       RETURNING id, name, email, avatar, settings`,
      [id, name, email, password, avatar, defaultSettings]
    );
    return result.rows[0];
  }

  async updateAvatar(userId, fileName) {
    const query = `
      UPDATE users 
      SET avatar = $1, updated_at = NOW() 
      WHERE id = $2 
      RETURNING id, name, email, avatar
    `;
    const { rows } = await db.query(query, [fileName, userId]);
    return rows[0];
  }

  async updateProfile(userId, { name, email }) {
    const query = `
      UPDATE users 
      SET name = $1, email = $2, updated_at = NOW() 
      WHERE id = $3 
      RETURNING id, name, email, avatar
    `;
    const { rows } = await db.query(query, [name, email, userId]);
    return rows[0];
  }

  async updatePassword(userId, hashedPassword) {
    const query = 'UPDATE users SET password = $1, updated_at = NOW() WHERE id = $2';
    await db.query(query, [hashedPassword, userId]);
  }

  async deleteUser(userId) {
    try {
      console.log("🔍 Tentando deletar o ID:", userId);

      const query = `
        UPDATE users 
        SET deleted_at = NOW(), 
            updated_at = NOW() 
        WHERE id = $1 
        RETURNING id, name, email, deleted_at
      `;
      
      const { rows, rowCount } = await db.query(query, [userId]);
      
      if (rowCount === 0) {
        console.log("⚠️ NENHUM usuário encontrado com esse ID no banco!");
        return null;
      }

      console.log("✅ RESULTADO DO BANCO:", rows[0]);
      return rows[0]; 
    } catch (error) {
      console.error("❌ ERRO NO SQL DO DELETE:", error.message);
      throw error;
    }
  }

  async updateSettings(userId, newSettings) {
    // 🚀 4. MERGE MANUAL: Como é TEXTO no banco, buscamos, juntamos no JS e salvamos.
    const { rows: currentRows } = await db.query('SELECT settings FROM users WHERE id = $1', [userId]);
    
    let currentSettings = {};
    if (currentRows.length > 0 && currentRows[0].settings) {
        try {
            currentSettings = JSON.parse(currentRows[0].settings);
        } catch (error) {
            console.error("Erro ao fazer parse das settings antigas");
        }
    }

    // Junta as configurações antigas com as novas
    const mergedSettings = JSON.stringify({ ...currentSettings, ...newSettings });

    const query = `
      UPDATE users 
      SET settings = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING id, name, email, settings
    `;
    const { rows } = await db.query(query, [mergedSettings, userId]);
    return rows[0];
  }
}

module.exports = new UserRepository();