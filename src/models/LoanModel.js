class Loan {
  constructor(data) {
    this.id = data.id;
    this.userId = data.user_id;
    this.walletId = data.wallet_id;
    this.title = data.title;
    this.debtorName = data.debtor_name;
    this.amount = Number(data.amount);
    this.dueDate = data.due_date ? new Date(data.due_date) : null;
    this.isPaid = data.is_paid;
    this.createdAt = data.created_at;
  }
}

module.exports = Loan;