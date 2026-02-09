const debtRepository = require('../repositories/DebtRepository');

class DebtService {
  
  async list(walletId) {
    return await debtRepository.findAll(walletId);
  }

  async getById(id) {
    return await debtRepository.findById(id);
  }

  async create(data) {
    let { wallet_id, type, title, entity_name, amount, due_date } = data;
    if (!wallet_id || !amount) {
      throw new Error("Carteira e Valor são obrigatórios.");
    }
    if (!title) {
        if (entity_name) {
            title = type === 'payable' 
                ? `Dívida com ${entity_name}` 
                : `Empréstimo para ${entity_name}`;
        } else {
            throw new Error("Informe um Título (ex: Aluguel) ou o Nome da pessoa.");
        }
    }

    if (!due_date) {
        due_date = new Date();
    }

    return await debtRepository.create({
      walletId: wallet_id,
      type,
      title,
      entityName: entity_name,
      amount,
      dueDate: due_date
    });
  }

  async addPayment(id, paymentAmount) {
    if (!paymentAmount || paymentAmount <= 0) {
      throw new Error("Valor do pagamento inválido.");
    }
    // O repositório cuidará de toda a transação financeira (saldo, extrato, status)
    return await debtRepository.addPayment(id, paymentAmount);
  }

  async update(id, data) {
    return await debtRepository.update(id, data);
  }

  async delete(id) {
    return await debtRepository.delete(id);
  }
}

module.exports = new DebtService();