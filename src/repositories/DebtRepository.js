const db = require('../config/db');
const Debt = require('../models/DebtModel');

class DebtRepository {
  async create({ userId, walletId, title, creditorName, amount, dueDate }) {
    const query = `
      INSERT INTO debts (user_id, wallet_id, title, creditor_name, amount, due_date)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *;
    `;
    const values = [userId, walletId, title, creditorName, amount, dueDate];
    
    const result = await db.query(query, values);
    return new Debt(result.rows[0]);
  }

  async findAllByUserId(userId) {
    const query = `
      SELECT * FROM debts 
      WHERE user_id = $1 
      ORDER BY is_paid ASC, due_date ASC;
    `;
    const result = await db.query(query, [userId]);
    return result.rows.map(row => new Debt(row));
  }

  async markAsPaid(id) {
    const query = `
      UPDATE debts SET is_paid = TRUE, updated_at = NOW() 
      WHERE id = $1 RETURNING *;
    `;
    const result = await db.query(query, [id]);
    if (result.rows.length > 0) return new Debt(result.rows[0]);
    return null;
  }
}

module.exports = new DebtRepository();