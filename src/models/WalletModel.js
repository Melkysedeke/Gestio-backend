class Wallet {
  constructor(data) {
    this.id = data.id;
    this.userId = data.user_id; 
    this.name = data.name;
    this.balance = Number(data.balance) || 0;
    this.color = data.color;
    this.archived = data.archived;
    this.createdAt = data.created_at;
    this.updatedAt = data.updated_at;
  }
}

module.exports = Wallet;