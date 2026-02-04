const db = require('../database/index');
const Wallet = require('../models/WalletModel');

class WalletRepository {
  async create({ userId, name, balance, color }) {
    const result = await db.query(
      `INSERT INTO wallets (user_id, name, balance, color)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [userId, name, balance, color]
    );
    return new Wallet(result.rows[0]);
  }

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

  async update(id, { name, color, archived }) {
    // Monta query dinâmica (só atualiza o que foi enviado)
    // Nota: Para simplificar o MVP, vamos atualizar tudo o que vier
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