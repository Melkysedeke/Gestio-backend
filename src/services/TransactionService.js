const transactionRepository = require('../repositories/TransactionRepository');
const walletRepository = require('../repositories/WalletRepository'); 
// Se precisar validar se a carteira pertence ao user, importe o walletRepo

class TransactionService {

  async list({ userId, walletId, startDate, endDate }) {
    // Aqui você poderia adicionar validação se a carteira pertence ao usuário
    return await transactionRepository.findAll({ userId, walletId, startDate, endDate });
  }

  async create({ walletId, categoryId, type, amount, description, transactionDate }) {
    // 1. Validações básicas
    if (!walletId || !amount || !type) {
      throw new Error("Dados obrigatórios faltando.");
    }

    // 2. Chama o repositório para criar a transação e atualizar saldo
    // (O Repositório já cuida do BEGIN/COMMIT)
    return await transactionRepository.create({
      walletId, 
      categoryId, 
      type, 
      amount, 
      description, 
      transactionDate: transactionDate || new Date()
    });
  }

  async update(userId, transactionId, data) {
    // Opcional: Verificar se a transação pertence ao user antes de atualizar
    return await transactionRepository.update(transactionId, data);
  }

  async delete(userId, transactionId) {
    // Opcional: Verificar se a transação pertence ao user antes de deletar
    return await transactionRepository.delete(transactionId);
  }
}

module.exports = new TransactionService();