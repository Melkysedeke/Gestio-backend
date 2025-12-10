class Goal {
  constructor(data) {
    this.id = data.id;
    this.userId = data.user_id;
    this.walletId = data.wallet_id;
    
    this.name = data.name;
    this.targetAmount = Number(data.target_amount);
    this.currentAmount = Number(data.current_amount);
    this.deadline = data.deadline ? new Date(data.deadline) : null;

    this.createdAt = data.created_at;
    this.updatedAt = data.updated_at;
  }

  get progressPercentage() {
    if (this.targetAmount <= 0) return 0;
    const percent = (this.currentAmount / this.targetAmount) * 100;
    return Math.min(100, percent).toFixed(1);
  }
}

module.exports = Goal;