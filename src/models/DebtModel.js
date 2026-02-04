class Debt {
  constructor(data) {
    this.id = data.id;
    this.walletId = data.wallet_id;
    this.type = data.type;
    this.title = data.title;
    this.entityName = data.entity_name;
    this.amount = Number(data.amount);
    this.dueDate = new Date(data.due_date);
    this.isPaid = data.is_paid;
    this.paidAt = data.paid_at ? new Date(data.paid_at) : null;
    this.createdAt = data.created_at;
    this.updatedAt = data.updated_at;
  }
}

module.exports = Debt;