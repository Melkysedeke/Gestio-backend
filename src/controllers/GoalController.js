const goalService = require('../services/GoalService');

class GoalController {
  async create(req, res) {
    try {
      const goal = await goalService.createGoal(req.body);
      return res.status(201).json(goal);
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  }

  async list(req, res) {
    try {
      const { userId } = req.params;
      const goals = await goalService.listGoals(userId);
      return res.json(goals);
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  }

  // Atualizar progresso (Depositar na meta)
  async updateProgress(req, res) {
    try {
      const { id } = req.params;
      const { currentAmount } = req.body;
      const goal = await goalService.addMoney(id, currentAmount);
      return res.json(goal);
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  }
}

module.exports = new GoalController();