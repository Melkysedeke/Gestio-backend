class Transaction {
  constructor(data) {
    this.id = data.id;
    this.walletId = data.wallet_id;
    this.categoryId = data.category_id;
    this.type = data.type;
    this.amount = Number(data.amount);
    this.description = data.description;
    this.transactionDate = new Date(data.transaction_date);
    this.recurrenceFrequency = data.recurrence_frequency;
    this.recurrenceEndDate = data.recurrence_end_date ? new Date(data.recurrence_end_date) : null;
    this.createdAt = data.created_at;
  }
}

module.exports = Transaction;