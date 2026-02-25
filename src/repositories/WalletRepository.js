const db = require('../database/index');
const Wallet = require('../models/WalletModel');
const crypto = require('crypto');

class WalletRepository {
  async findById(id) {
    // id aqui agora é uma String (UUID)
    const result = await db.query('SELECT * FROM wallets WHERE id = $1', [id]);
    return result.rows[0] ? new Wallet(result.rows[0]) : null;
  }

  async create({ id, userId, name, balance, color }) {
    // 🚀 Se o ID não vier do front (ex: via Postman), geramos um aqui
    const walletId = id || crypto.randomUUID();

    const query = `
      INSERT INTO wallets (id, user_id, name, balance, color, created_at, updated_at) 
      VALUES ($1, $2, $3, $4, $5, NOW(), NOW()) 
      RETURNING *
    `;
    const values = [walletId, userId, name, balance || 0, color || '#1773cf'];
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
      [name, color, archived, id] // id é String
    );
    return new Wallet(result.rows[0]);
  }

  async delete(id) {
    // 🚀 Mudamos para Soft Delete para não quebrar a sincronia
    await db.query('UPDATE wallets SET deleted_at = NOW(), updated_at = NOW() WHERE id = $1', [id]);
  }
}

module.exports = new WalletRepository();