class Transaction {
  constructor(data) {
    this.id = data.id;
    this.walletId = data.wallet_id;
    this.categoryId = data.category_id || null; 
    this.type = data.type;
    this.amount = data.amount ? Number(data.amount) : 0;
    this.description = data.description || '';
    this.transactionDate = data.transaction_date ? new Date(data.transaction_date) : new Date();
    this.createdAt = data.created_at;
    this.updatedAt = data.updated_at;
    if (data.category_name) {
      this.categoryName = data.category_name;
      this.categoryIcon = data.category_icon;
    }
  }

  get formattedAmount() {
    return this.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }
}

module.exports = Transaction;