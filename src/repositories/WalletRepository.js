const db = require('../database/index');
const Wallet = require('../models/WalletModel');

class WalletRepository {
  async findAllByUserId(userId) {
    const result = await db.query(
      `SELECT * FROM wallets WHERE user_id = $1 AND archived = false ORDER BY created_at ASC`,
      [userId]
    );
    return result.rows.map(row => new Wallet(row));
  }
  
  async findById(id) {
    const result = await db.query('SELECT * FROM wallets WHERE id = $1', [id]);
    return result.rows[0] ? new Wallet(result.rows[0]) : null;
  }

  async create({ userId, name, balance, color }) {
    const query = `
      INSERT INTO wallets (user_id, name, balance, color) 
      VALUES ($1, $2, $3, $4) 
      RETURNING *
    `;
    const values = [userId, name, balance || 0, color || '#1773cf'];
    const { rows } = await db.query(query, values);
    return rows[0];
  }

  async update(id, { name, color, archived }) {
    const result = await db.query(
      `UPDATE wallets 
       SET name = COALESCE($1, name), 
           color = COALESCE($2, color), 
           archived = COALESCE($3, archived),
           updated_at = NOW()
       WHERE id = $4
       RETURNING *`,
      [name, color, archived, id]
    );
    return new Wallet(result.rows[0]);
  }

  async delete(id) {
    await db.query('DELETE FROM wallets WHERE id = $1', [id]);
  }
}

module.exports = new WalletRepository();