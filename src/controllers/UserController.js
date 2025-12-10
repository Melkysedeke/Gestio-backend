// src/controllers/UserController.js
const userService = require('../services/UserService');

class UserController {
  async create(req, res) {
    try {
      const { name, email, password, avatarUrl } = req.body;

      // Chama o Service
      const user = await userService.createUser(name, email, password, avatarUrl);

      // Retorna 201 (Created) e o JSON seguro (sem senha)
      return res.status(201).json(user.toSafeJSON());
    } catch (error) {
      // Se der erro (ex: email duplicado), devolve 400
      return res.status(400).json({ error: error.message });
    }
  }
}

module.exports = new UserController();