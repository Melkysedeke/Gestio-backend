const db = require('../config/db');
const Transaction = require('../models/TransactionModel');

class TransactionRepository {
  async create({ walletId, categoryId, type, amount, description, transactionDate, recurrenceFrequency, recurrenceEndDate }) {
    const query = `
      INSERT INTO transactions 
      (wallet_id, category_id, type, amount, description, transaction_date, recurrence_frequency, recurrence_end_date)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *;
    `;
    
    const values = [
      walletId, 
      categoryId, 
      type, 
      amount, 
      description, 
      transactionDate, 
      recurrenceFrequency || 'none',
      recurrenceEndDate || null
    ];

    const result = await db.query(query, values);
    return new Transaction(result.rows[0]);
  }

  async findAllByWalletId(walletId) {
    const query = `
      SELECT * FROM transactions 
      WHERE wallet_id = $1 
      ORDER BY transaction_date DESC;
    `;
    const result = await db.query(query, [walletId]);
    
    return result.rows.map(row => new Transaction(row));
  }

  async delete(id) {
    const query = 'DELETE FROM transactions WHERE id = $1 RETURNING id';
    await db.query(query, [id]);
  }
}

module.exports = new TransactionRepository();