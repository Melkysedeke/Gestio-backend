const db = require('../config/db');
const UserSettings = require('../models/UserSettingsModel');

class UserSettingsRepository {
  async create(userId) {
    const query = `
      INSERT INTO user_settings (user_id)
      VALUES ($1)
      RETURNING *;
    `;
    const result = await db.query(query, [userId]);
    return new UserSettings(result.rows[0]);
  }

  async findByUserId(userId) {
    const query = 'SELECT * FROM user_settings WHERE user_id = $1';
    const result = await db.query(query, [userId]);
    
    if (result.rows.length > 0) {
      return new UserSettings(result.rows[0]);
    }
    return null;
  }

  async updateLastWallet(userId, walletId) {
    const query = `
      UPDATE user_settings 
      SET last_opened_wallet = $1, updated_at = NOW()
      WHERE user_id = $2
      RETURNING *;
    `;
    const result = await db.query(query, [walletId, userId]);
    return new UserSettings(result.rows[0]);
  }
}

module.exports = new UserSettingsRepository();