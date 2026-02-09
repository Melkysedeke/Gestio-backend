const { Router } = require('express');
const UserController = require('../controllers/UserController');
const AuthController = require('../controllers/AuthController');
const AuthMiddleware = require('../middlewares/AuthMiddleware');
const multer = require('multer');

const uploadConfig = require('../config/multer');
const upload = multer(uploadConfig);

const userRoutes = Router();

userRoutes.post('/signup', upload.single('avatar'), UserController.store);
userRoutes.post('/signin', AuthController.signin);

userRoutes.use(AuthMiddleware);

userRoutes.patch('/avatar', UserController.updateAvatar);
userRoutes.put('/profile', UserController.updateProfile);
userRoutes.put('/password', UserController.updatePassword);
userRoutes.delete('/delete', UserController.deleteUser);

userRoutes.patch('/settings', UserController.updateSettings);


module.exports = userRoutes;