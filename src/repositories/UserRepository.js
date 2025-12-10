const db = require('../config/db');
const User = require('../models/UserModel');

class UserRepository {
  async create(name, email, passwordHash, avatarUrl) {
    const query = `
      INSERT INTO users (name, email, password_hash, avatar_url)
      VALUES ($1, $2, $3, $4)
      RETURNING *;
    `;
    const values = [name, email, passwordHash, avatarUrl];
    
    const result = await db.query(query, values);
    return new User(result.rows[0]);
  }

  async findByEmail(email) {
    const query = 'SELECT * FROM users WHERE email = $1';
    const result = await db.query(query, [email]);
    
    if (result.rows.length > 0) {
        return new User(result.rows[0]);
    }
    return null;
  }
}

module.exports = new UserRepository();