class Wallet {
  constructor(data) {
    this.id = data.id;
    this.userId = data.user_id;
    this.name = data.name;
    this.currentBalance = Number(data.current_balance); 
    this.createdAt = data.created_at;
    this.updatedAt = data.updated_at;
  }
}

module.exports = Wallet;