const db = require('../database/index');
const Category = require('../models/CategoryModel');
const crypto = require('crypto');

class CategoryRepository {
  async findAll(userId) {
    // 🚀 Busca categorias globais (user_id IS NULL) OU do usuário logado
    const query = `
      SELECT * FROM categories 
      WHERE (user_id IS NULL OR user_id = $1) 
      AND deleted_at IS NULL
      ORDER BY type, name ASC
    `;
    const result = await db.query(query, [userId]);
    return result.rows.map(row => new Category(row));
  }

  async findById(id) {
    // id é UUID (String)
    const query = 'SELECT * FROM categories WHERE id = $1';
    const result = await db.query(query, [id]);
    
    if (result.rows.length > 0) {
      return new Category(result.rows[0]);
    }
    return null;
  }

  async create({ id, userId, name, icon, type, color }) {
    const categoryId = id || crypto.randomUUID();
    
    const query = `
      INSERT INTO categories (id, user_id, name, icon, type, color, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
      RETURNING *
    `;
    const values = [categoryId, userId, name, icon, type, color || '#94a3b8'];
    const { rows } = await db.query(query, values);
    return rows[0];
  }
}

module.exports = new CategoryRepository();