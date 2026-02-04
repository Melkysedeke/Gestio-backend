const goalRepository = require('../repositories/GoalRepository');

class GoalService {
  async createGoal(data) {
    if (!data.name || !data.targetAmount) {
      throw new Error('Nome e Valor Alvo são obrigatórios.');
    }
    return await goalRepository.create(data);
  }

  async listGoals(userId) {
    return await goalRepository.findAllByUserId(userId);
  }

  async addMoney(id, currentAmount) {
    return await goalRepository.updateProgress(id, currentAmount);
  }
}

module.exports = new GoalService();