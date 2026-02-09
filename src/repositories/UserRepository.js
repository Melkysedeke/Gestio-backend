const db = require('../database/index'); // Seu arquivo de conexão pool

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
    const result = await db.query(
      `INSERT INTO users (name, email, password, avatar)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, email, avatar`,
      [name, email, password, avatar]
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
    const query = 'DELETE FROM users WHERE id = $1 RETURNING avatar';
    const { rows } = await db.query(query, [userId]);
    return rows[0]; 
  }

  async updateSettings(userId, newSettings) {
    const query = `
      UPDATE users 
      SET settings = COALESCE(settings, '{}'::jsonb) || $1::jsonb
      WHERE id = $2
      RETURNING id, name, email, settings
    `;
    // O driver do Postgres (pg) já converte o objeto JS 'newSettings' para JSON automaticamente
    const { rows } = await db.query(query, [newSettings, userId]);
    
    return rows[0];
  }
}

module.exports = new UserRepository();