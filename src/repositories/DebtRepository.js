const db = require('../database/index');

class DebtLoanRepository {
  
  // table = 'debts' ou 'loans'
  async create(table, { walletId, title, name, amount, dueDate }) {
    const client = await db.connect();
    try {
      // nameField: 'creditor_name' (Dívida) ou 'debtor_name' (Empréstimo)
      const nameField = table === 'debts' ? 'creditor_name' : 'debtor_name';
      
      const result = await client.query(
        `INSERT INTO ${table} (wallet_id, title, ${nameField}, amount, due_date, is_paid)
         VALUES ($1, $2, $3, $4, $5, false)
         RETURNING *`,
        [walletId, title, name, amount, dueDate]
      );
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  async findAll(table, walletId) {
    const result = await db.query(
      `SELECT * FROM ${table} WHERE wallet_id = $1 ORDER BY due_date ASC`,
      [walletId]
    );
    return result.rows;
  }

  async delete(table, id) {
    await db.query(`DELETE FROM ${table} WHERE id = $1`, [id]);
  }

  async togglePaid(table, id) {
    const client = await db.connect();
    try {
      await client.query('BEGIN');

      // 1. Busca o item (Dívida ou Empréstimo)
      const res = await client.query(`SELECT * FROM ${table} WHERE id = $1`, [id]);
      const item = res.rows[0];
      if (!item) throw new Error('Item not found');

      // 2. Define o novo status
      const newStatus = !item.is_paid;

      // 3. Atualiza o saldo da carteira
      let amountChange = 0;
      let transactionType = '';
      let categoryId = 8; // ID 8 = Outros (ou crie categorias "Dívidas"/"Empréstimos")
      let description = '';

      if (table === 'debts') {
        // Pagar dívida = Saída de dinheiro
        amountChange = newStatus ? -item.amount : item.amount;
        transactionType = 'expense';
        description = `Pagamento: ${item.title}`;
        // Se tiver categoria de Dívida (ex: id 5 ou outra), pode setar aqui
      } else {
        // Receber empréstimo = Entrada de dinheiro
        amountChange = newStatus ? item.amount : -item.amount;
        transactionType = 'income';
        description = `Recebimento: ${item.title}`;
        categoryId = 13; // Outros/Entradas
      }

      // Atualiza Saldo
      await client.query(
        `UPDATE wallets SET balance = balance + $1 WHERE id = $2`,
        [amountChange, item.wallet_id]
      );

      // 4. Se virou PAGO, CRIA O REGISTRO NA TRANSAÇÃO PARA FICAR NO EXTRATO
      if (newStatus === true) {
        await client.query(
          `INSERT INTO transactions (wallet_id, description, amount, type, category_id, date)
           VALUES ($1, $2, $3, $4, $5, NOW())`,
          [item.wallet_id, description, item.amount, transactionType, categoryId]
        );
      } else {
        // (Opcional) Se desmarcou (estorno), poderia criar uma transação de estorno ou apagar a anterior.
        // Por simplicidade neste MVP, apenas ajustamos o saldo (passo 3) sem criar transação de estorno,
        // ou você pode criar uma transação inversa aqui se quiser.
      }

      // 5. Atualiza o status na tabela de origem (debts/loans)
      const updateRes = await client.query(
        `UPDATE ${table} SET is_paid = $1 WHERE id = $2 RETURNING *`,
        [newStatus, id]
      );

      await client.query('COMMIT');
      return updateRes.rows[0];

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

module.exports = new DebtLoanRepository();