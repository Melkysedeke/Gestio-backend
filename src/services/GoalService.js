const goalRepository = require('../repositories/GoalRepository');

class GoalService {
  async list(walletId) {
    if (!walletId) throw new Error('Wallet ID é obrigatório');
    return await goalRepository.findAll(walletId);
  }

  async create(data) {
    const { wallet_id, name, target_amount, deadline, color } = data;

    if (!wallet_id || !name || !target_amount) {
      throw new Error('Dados obrigatórios: Carteira, Nome e Valor Meta.');
    }

    if (target_amount <= 0) {
      throw new Error('A meta deve ser maior que zero.');
    }

    return await goalRepository.create({
      walletId: wallet_id,
      name,
      targetAmount: target_amount,
      deadline,
      color: color || '#1773cf'
    });
  }

  async update(id, data) {
    const { name, target_amount, deadline, color } = data;

    if (!name || !name.trim()) {
      throw new Error('O nome do objetivo é obrigatório.');
    }

    if (!target_amount || parseFloat(target_amount) <= 0) {
      throw new Error('A meta deve ser um valor maior que zero.');
    }
    const updateData = {
      name: name.trim(),
      targetAmount: parseFloat(target_amount),
      deadline: deadline, // Pode ser null se o usuário limpar
      color: color || '#1773cf'
    };
    return await goalRepository.update(id, updateData);
  }

  async deposit(id, amount) {
    if (amount <= 0) throw new Error('Valor do depósito deve ser positivo.');
    return await goalRepository.deposit(id, amount);
  }

  async withdraw(id, amount) {
    if (amount <= 0) throw new Error('Valor do resgate deve ser positivo.');
    return await goalRepository.withdraw(id, amount);
  }

  async delete(id) {
    return await goalRepository.delete(id);
  }
}

module.exports = new GoalService();