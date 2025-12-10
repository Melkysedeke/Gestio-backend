const db = require('../config/db');
const Goal = require('../models/GoalModel');

class GoalRepository {
  async create({ userId, walletId, name, targetAmount, currentAmount, deadline }) {
    const query = `
      INSERT INTO goals (user_id, wallet_id, name, target_amount, current_amount, deadline)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *;
    `;
    
    const values = [userId, walletId, name, targetAmount, currentAmount || 0, deadline];
    
    const result = await db.query(query, values);
    return new Goal(result.rows[0]);
  }

  async findAllByUserId(userId) {
    const query = `
      SELECT * FROM goals 
      WHERE user_id = $1 
      ORDER BY deadline ASC NULLS LAST; 
    `;
    const result = await db.query(query, [userId]);
    return result.rows.map(row => new Goal(row));
  }

  async updateProgress(id, newCurrentAmount) {
    const query = `
      UPDATE goals 
      SET current_amount = $1, updated_at = NOW() 
      WHERE id = $2 
      RETURNING *;
    `;
    const result = await db.query(query, [newCurrentAmount, id]);
    
    if (result.rows.length > 0) {
      return new Goal(result.rows[0]);
    }
    return null;
  }

  async updateDetails(id, { name, targetAmount, deadline }) {
    const query = `
      UPDATE goals 
      SET name = $1, target_amount = $2, deadline = $3, updated_at = NOW()
      WHERE id = $4 
      RETURNING *;
    `;
    const result = await db.query(query, [name, targetAmount, deadline, id]);
    
    if (result.rows.length > 0) return new Goal(result.rows[0]);
    return null;
  }

  async delete(id) {
    const query = 'DELETE FROM goals WHERE id = $1';
    await db.query(query, [id]);
  }
}

module.exports = new GoalRepository();