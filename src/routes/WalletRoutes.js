const { Router } = require('express');
const WalletController = require('../controllers/WalletController');
const AuthMiddleware = require('../middlewares/AuthMiddleware');

const walletRoutes = Router();

walletRoutes.use(AuthMiddleware);

walletRoutes.post('/', WalletController.store); // Criar
walletRoutes.get('/', WalletController.index); // Listar
walletRoutes.put('/:id', WalletController.update); // Editar
walletRoutes.delete('/:id', WalletController.delete); // Deletar

module.exports = walletRoutes;