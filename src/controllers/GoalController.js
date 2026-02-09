const goalService = require('../services/GoalService');

class GoalController {
  index = async (req, res) => {
    try {
      const { wallet_id } = req.query;
      const goals = await goalService.list(wallet_id);
      return res.json(goals);
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  }

  store = async (req, res) => {
    try {
      const goal = await goalService.create(req.body);
      return res.status(201).json(goal);
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  }

  update = async (req, res) => {
    try {
      const { id } = req.params;
      const { name, target_amount, deadline, color } = req.body;
      const updatedGoal = await require('../repositories/GoalRepository').update(id, {
        name, 
        targetAmount: target_amount, 
        deadline, 
        color
      });
      
      return res.json(updatedGoal);
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  }

  deposit = async (req, res) => {
    try {
      const { id } = req.params;
      const { amount } = req.body;
      const result = await goalService.deposit(id, amount);
      return res.json(result);
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  }

  withdraw = async (req, res) => {
    try {
      const { id } = req.params;
      const { amount } = req.body;
      const result = await goalService.withdraw(id, amount);
      return res.json(result);
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  }

  delete = async (req, res) => {
    try {
      const { id } = req.params;
      await goalService.delete(id);
      return res.status(204).send();
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  }
}

module.exports = new GoalController();