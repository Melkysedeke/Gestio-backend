const { Router } = require('express');

// Importa as rotas individuais
const userRoutes = require('./UserRoutes');
const walletRoutes = require('./walletRoutes'); 
const transactionRoutes = require('./transactionRoutes');
const categoryRoutes = require('./categoryRoutes');
const goalRoutes = require('./goalRoutes');
const debtRoutes = require('./debtRoutes');

const routes = Router();

// Define os prefixos (Endereços base)
routes.use('/users', userRoutes);
routes.use('/wallets', walletRoutes); 
routes.use('/transactions', transactionRoutes);
routes.use('/categories', categoryRoutes);
routes.use('/goals', goalRoutes);
routes.use('/debts', debtRoutes);

module.exports = routes;