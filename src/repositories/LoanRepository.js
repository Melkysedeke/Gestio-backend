const db = require('../config/db');
const Loan = require('../models/LoanModel');

class LoanRepository {
  async create({ userId, walletId, title, debtorName, amount, dueDate }) {
    const query = `
      INSERT INTO loans (user_id, wallet_id, title, debtor_name, amount, due_date)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *;
    `;
    const values = [userId, walletId, title, debtorName, amount, dueDate];
    
    const result = await db.query(query, values);
    return new Loan(result.rows[0]);
  }

  async findAllByUserId(userId) {
    const query = `
      SELECT * FROM loans 
      WHERE user_id = $1 
      ORDER BY is_paid ASC, due_date ASC;
    `;
    const result = await db.query(query, [userId]);
    return result.rows.map(row => new Loan(row));
  }

  async markAsPaid(id) {
    const query = `
      UPDATE loans SET is_paid = TRUE, updated_at = NOW() 
      WHERE id = $1 RETURNING *;
    `;
    const result = await db.query(query, [id]);
    if (result.rows.length > 0) return new Loan(result.rows[0]);
    return null;
  }
}

module.exports = new LoanRepository();