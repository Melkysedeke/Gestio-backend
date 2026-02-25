const categoryService = require('../services/CategoryService');

class CategoryController {
  index = async (req, res) => {
    try {
      const userId = req.user.id;
      const categories = await categoryService.findAll(userId);
      return res.json(categories);
    } catch (error) {
      console.error('Erro ao buscar categorias:', error);
      return res.status(500).json({ error: 'Erro ao carregar lista de categorias.' });
    }
  }

  store = async (req, res) => {
    try {
      const userId = req.user.id;
      const { id, name, icon, type, color } = req.body;

      const category = await categoryService.create({
        id, // UUID vindo do Mobile
        userId,
        name,
        icon,
        type,
        color
      });

      return res.status(201).json(category);
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  }
}

module.exports = new CategoryController();