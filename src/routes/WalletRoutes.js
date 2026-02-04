const { Router } = require('express');
const WalletController = require('../controllers/WalletController');
const authMiddleware = require('../middlewares/authMiddleware');

const walletRoutes = Router();

walletRoutes.use(authMiddleware);

walletRoutes.post('/', WalletController.create); // Criar
walletRoutes.get('/', WalletController.index); // Listar
walletRoutes.put('/:id', WalletController.update); // Editar
walletRoutes.delete('/:id', WalletController.delete); // Deletar

module.exports = walletRoutes;