class Goal {
  constructor(data) {
    this.id = data.id;
    this.walletId = data.wallet_id;
    this.name = data.name;
    this.targetAmount = Number(data.target_amount);
    this.currentAmount = Number(data.current_amount) || 0;
    this.deadline = data.deadline ? new Date(data.deadline) : null;
    this.color = data.color;
    this.isCompleted = data.is_completed;
    this.createdAt = data.created_at;
    this.updatedAt = data.updated_at;
  }
}

module.exports = Goal;