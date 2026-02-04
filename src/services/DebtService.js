const debtRepository = require('../repositories/DebtLoanRepository');

class DebtService {
  async create(data) {
    return await debtRepository.create(data);
  }
  async list(userId) {
    return await debtRepository.findAllByUserId(userId);
  }
  async pay(id) {
    return await debtRepository.markAsPaid(id);
  }
}
module.exports = new DebtService();