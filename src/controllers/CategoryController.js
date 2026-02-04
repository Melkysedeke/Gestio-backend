const db = require('../database/index');

class CategoryController {
  // Lista todas as categorias
  index = async (req, res) => {
    try {
      // Buscamos todas as categorias ordenadas por nome
      const result = await db.query('SELECT * FROM categories ORDER BY name ASC');
      return res.json(result.rows);
    } catch (error) {
      console.error('Erro ao buscar categorias:', error);
      return res.status(500).json({ error: 'Erro ao carregar lista de categorias.' });
    }
  }

  // Se você quiser permitir que o usuário crie categorias personalizadas no futuro:
  store = async (req, res) => {
    const { name, icon, type } = req.body;
    try {
      const result = await db.query(
        'INSERT INTO categories (name, icon, type) VALUES ($1, $2, $3) RETURNING *',
        [name, icon, type]
      );
      return res.status(201).json(result.rows[0]);
    } catch (error) {
      return res.status(500).json({ error: 'Erro ao criar categoria.' });
    }
  }
}

module.exports = new CategoryController();