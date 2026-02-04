const db = require('../database/index');
const Category = require('../models/CategoryModel');

class CategoryRepository {
  async findAll() {
    const query = 'SELECT * FROM categories ORDER BY type, name ASC';
    const result = await db.query(query);
    
    return result.rows.map(row => new Category(row));
  }

  async findById(id) {
    const query = 'SELECT * FROM categories WHERE id = $1';
    const result = await db.query(query, [id]);
    
    if (result.rows.length > 0) {
      return new Category(result.rows[0]);
    }
    return null;
  }
}

module.exports = new CategoryRepository();