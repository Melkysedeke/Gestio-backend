// src/app.js
const express = require('express');
// Importar suas rotas
const userRoutes = require('./routes/UserRoutes');
// const walletRoutes = require('./routes/wallet.routes'); (Descomente quando fizer)

const app = express();

app.use(express.json()); // Importante para ler JSON

// Definir as rotas bases
app.use('/users', userRoutes); 
// app.use('/wallets', walletRoutes);

module.exports = app;