// userRoutes.js
const { Router } = require('express');
const UserController = require('../controllers/UserController');
const authMiddleware = require('../middlewares/authMiddleware');

const userRoutes = Router();

// Públicas
userRoutes.post('/signup', UserController.create);
userRoutes.post('/signin', UserController.login);

// Privadas (Perfil e Configurações)
userRoutes.get('/me', authMiddleware, UserController.show); // Autenticação
userRoutes.put('/profile', authMiddleware, UserController.updateProfile); // Nome, Email
userRoutes.patch('/avatar', authMiddleware, UserController.updateAvatar); // Imagem
userRoutes.put('/settings', authMiddleware, UserController.updateSettings); // Tema, Preferências
userRoutes.put('/update-password', authMiddleware, UserController.updatePassword); // Senha
userRoutes.delete('/profile', authMiddleware, UserController.deleteAccount); // Deletar

module.exports = userRoutes;