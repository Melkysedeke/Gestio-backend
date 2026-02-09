const { Router } = require('express');
const GoalController = require('../controllers/GoalController');
const authMiddleware = require('../middlewares/AuthMiddleware');

const GoalRoutes = Router();

GoalRoutes.use(authMiddleware);

GoalRoutes.get('/', GoalController.index);
GoalRoutes.post('/', GoalController.store);
GoalRoutes.put('/:id', GoalController.update);
GoalRoutes.patch('/:id/deposit', GoalController.deposit);  // Rota para guardar dinheiro
GoalRoutes.patch('/:id/withdraw', GoalController.withdraw); // Rota para resgatar dinheiro
GoalRoutes.delete('/:id', GoalController.delete);

module.exports = GoalRoutes;