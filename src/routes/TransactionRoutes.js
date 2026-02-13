const { Router } = require('express');
const TransactionController = require('../controllers/TransactionController');
const AuthMiddleware = require('../middlewares/AuthMiddleware');

const transactionRoutes = Router();

transactionRoutes.use(AuthMiddleware); // Autenticação

transactionRoutes.post('/', TransactionController.create); // Nova Transação
transactionRoutes.get('/', TransactionController.index); // Filtro
transactionRoutes.get('/:id', TransactionController.show);
transactionRoutes.put('/:id', TransactionController.update);
transactionRoutes.delete('/:id', TransactionController.delete); // Delete com estorno

module.exports = transactionRoutes;