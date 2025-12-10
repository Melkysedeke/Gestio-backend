// src/routes/user.routes.js
const { Router } = require('express');
const userController = require('../controllers/UserController');

const router = Router();

// POST http://localhost:3000/users
router.post('/', userController.create);

module.exports = router;