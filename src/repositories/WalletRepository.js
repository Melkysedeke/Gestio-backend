const db = require('../config/db');
const Wallet = require('../models/WalletModel');

class WalletRepository {
  async create(userId, name) {
    const query = `
      INSERT INTO wallets (user_id, name, current_balance)
      VALUES ($1, $2, 0)
      RETURNING *;
    `;
    
    const result = await db.query(query, [userId, name]);
    return new Wallet(result.rows[0]);
  }

  async findByUserId(userId) {
    const query = `
      SELECT * FROM wallets 
      WHERE user_id = $1 
      ORDER BY created_at ASC;
    `;
    
    const result = await db.query(query, [userId]);
    
    return result.rows.map(row => new Wallet(row));
  }

  async findById(id) {
    const query = 'SELECT * FROM wallets WHERE id = $1';
    const result = await db.query(query, [id]);
    
    if (result.rows.length > 0) {
      return new Wallet(result.rows[0]);
    }
    return null;
  }

  async updateBalance(id, newBalance) {
    const query = `
      UPDATE wallets 
      SET current_balance = $1, updated_at = NOW() 
      WHERE id = $2 
      RETURNING *;
    `;
    
    const result = await db.query(query, [newBalance, id]);
    
    if (result.rows.length > 0) {
      return new Wallet(result.rows[0]);
    }
    return null;
  }

  async delete(id) {
    const query = 'DELETE FROM wallets WHERE id = $1 RETURNING id';
    await db.query(query, [id]);
    return true;
  }
}

module.exports = new WalletRepository();