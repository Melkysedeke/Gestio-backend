const transactionService = require('../services/TransactionService');

class TransactionController {
  
  // Lista todas as transações (com filtro opcional de wallet_id e datas)
  index = async (req, res) => {
    try {
      const userId = req.user.id;
      const { wallet_id, startDate, endDate } = req.query;

      const transactions = await transactionService.list({ 
        userId, 
        walletId: wallet_id, 
        startDate, 
        endDate 
      });
      
      return res.json(transactions);
    } catch (error) {
      console.error("Erro ao listar transações:", error.message);
      return res.status(400).json({ error: error.message });
    }
  }

  // Cria uma nova transação
  create = async (req, res) => {
    try {
      const userId = req.user.id;
      // Pegamos os dados do body
      const { wallet_id, category_id, type, amount, description, transaction_date } = req.body;

      const transaction = await transactionService.create({
        userId,
        walletId: wallet_id,
        categoryId: category_id,
        type,
        amount,
        description,
        transactionDate: transaction_date
      });

      return res.status(201).json(transaction);
    } catch (error) {
      console.error("Erro ao criar transação:", error.message);
      return res.status(400).json({ error: error.message });
    }
  }

  // Atualiza uma transação existente
  update = async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const { amount, description, category_id, transaction_date } = req.body;

      const updatedTransaction = await transactionService.update(userId, id, {
        amount,
        description,
        categoryId: category_id,
        transactionDate: transaction_date
      });

      return res.json(updatedTransaction);
    } catch (error) {
      console.error("Erro ao atualizar transação:", error.message);
      return res.status(400).json({ error: error.message });
    }
  }

  // Deleta uma transação
  delete = async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      await transactionService.delete(userId, id);

      return res.status(204).send(); // Sucesso sem conteúdo
    } catch (error) {
      console.error("Erro ao deletar transação:", error.message);
      return res.status(400).json({ error: error.message });
    }
  }
}

module.exports = new TransactionController();