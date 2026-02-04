const { Router } = require('express');
const CategoryController = require('../controllers/CategoryController');
const authMiddleware = require('../middlewares/authMiddleware');

const categoryRoutes = Router();

categoryRoutes.use(authMiddleware);

categoryRoutes.get('/', CategoryController.index);
categoryRoutes.post('/', CategoryController.store);

module.exports = categoryRoutes;