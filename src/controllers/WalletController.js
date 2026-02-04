const walletService = require('../services/WalletService');

class WalletController {
  async create(req, res) {
    // req.userId vem do AuthMiddleware
    const { name, balance, color } = req.body;

    try {
      const wallet = await walletService.createWallet(req.userId, { name, balance, color });
      return res.status(201).json(wallet);
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  }

  async index(req, res) {
    try {
      const wallets = await walletService.listWallets(req.userId);
      return res.json(wallets);
    } catch (error) {
      return res.status(500).json({ error: 'Erro ao listar carteiras.' });
    }
  }

  async update(req, res) {
    const { id } = req.params;
    const { name, color, archived } = req.body;

    try {
      const wallet = await walletService.updateWallet(req.userId, Number(id), { name, color, archived });
      return res.json(wallet);
    } catch (error) {
      // Se for erro de permissão ou não encontrado
      return res.status(400).json({ error: error.message });
    }
  }

  async delete(req, res) {
    const { id } = req.params;

    try {
      await walletService.deleteWallet(req.userId, Number(id));
      return res.status(204).send(); // 204 = No Content (Sucesso sem corpo)
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  }
}

module.exports = new WalletController();