const { Router } = require('express');
const TransactionController = require('../controllers/TransactionController');
const authMiddleware = require('../middlewares/authMiddleware');

const transactionRoutes = Router();

transactionRoutes.use(authMiddleware); // Autenticação
transactionRoutes.post('/', TransactionController.create); // Nova Transação
transactionRoutes.get('/', TransactionController.index); // Filtro
transactionRoutes.put('/:id', TransactionController.update);
transactionRoutes.delete('/:id', TransactionController.delete); // Delete com estorno

module.exports = transactionRoutes;