const debtService = require('../services/DebtService');

class DebtController {
  
  index = async (req, res) => {
    try {
      const { wallet_id } = req.query;
      const debts = await debtService.list(wallet_id);
      return res.json(debts);
    } catch (error) {
      console.error("Erro ao listar dívidas:", error.message);
      return res.status(500).json({ error: 'Erro ao buscar dívidas.' });
    }
  }

  store = async (req, res) => {
    try {
      // Repassamos o body inteiro para o serviço
      const debt = await debtService.create(req.body);
      return res.status(201).json(debt);
    } catch (error) {
      console.error("Erro ao criar dívida:", error.message);
      return res.status(400).json({ error: error.message });
    }
  }

  update = async (req, res) => {
    try {
      const { id } = req.params;
      const updatedGoal = await goalService.update(id, req.body);
      
      return res.json(updatedGoal);
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  }

  show = async (req, res) => {
    try {
      const { id } = req.params;
      const debt = await debtService.getById(id);
      if (!debt) return res.status(404).json({ error: 'Dívida não encontrada.' });
      return res.json(debt);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  // Abatimento / Pagamento Parcial
  deposit = async (req, res) => {
    try {
      const { id } = req.params;
      const { paymentAmount } = req.body;

      const result = await debtService.addPayment(id, paymentAmount);
      
      return res.json(result);
    } catch (error) {
      console.error("Erro no abatimento:", error.message);
      return res.status(400).json({ error: error.message });
    }
  }

  delete = async (req, res) => {
    try {
      const { id } = req.params;
      await debtService.delete(id);
      return res.status(204).send();
    } catch (error) {
      console.error("Erro ao deletar:", error.message);
      return res.status(400).json({ error: error.message });
    }
  }
}

module.exports = new DebtController();