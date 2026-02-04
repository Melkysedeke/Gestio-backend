const db = require('../database/index');
const User = require('../models/UserModel');

class UserRepository {
  async findByEmail(email) {
    const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    return result.rows[0] ? new User(result.rows[0]) : null;
  }

  async findById(id) {
    const result = await db.query('SELECT * FROM users WHERE id = $1', [id]);
    return result.rows[0] ? new User(result.rows[0]) : null;
  }

  async create({ name, email, passwordHash, avatar }) {
    // Define configurações padrão no momento da criação
    const defaultSettings = { theme: 'light', last_opened_wallet: null };

    const result = await db.query(
      `INSERT INTO users (name, email, password, avatar, settings) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING *`,
      [name, email, passwordHash, avatar, JSON.stringify(defaultSettings)]
    );
    return new User(result.rows[0]);
  }

  async updateSettings(userId, newSettings) {
    // O operador || do Postgres faz o merge do JSON antigo com o novo
    await db.query(
      `UPDATE users 
       SET settings = settings || $1::jsonb, updated_at = NOW() 
       WHERE id = $2`,
      [JSON.stringify(newSettings), userId]
    );
  }
}

module.exports = new UserRepository();