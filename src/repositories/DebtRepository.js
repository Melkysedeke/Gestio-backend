const db = require('../database/index');

class DebtRepository {

  async findAll(walletId) {
    // 🚀 Só buscamos dívidas NÃO deletadas
    const result = await db.query(
      'SELECT * FROM debts WHERE wallet_id = $1 AND deleted_at IS NULL ORDER BY due_date ASC',
      [walletId]
    );
    return result.rows;
  }

  async findById(id) {
    const result = await db.query('SELECT * FROM debts WHERE id = $1', [id]);
    return result.rows[0];
  }

  async create({ id, walletId, type, title, entityName, amount, dueDate }) {
    // 🚀 Aceita o ID do WatermelonDB (UUID)
    const debtId = id || crypto.randomUUID();

    const result = await db.query(
      `INSERT INTO debts (id, wallet_id, type, title, entity_name, amount, due_date, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
       RETURNING *`,
      [debtId, walletId, type, title, entityName, amount, dueDate]
    );
    return result.rows[0];
  }

  async addPayment(id, paymentAmount) {
    const client = await db.connect();
    try {
      await client.query('BEGIN');

      const debtRes = await client.query('SELECT * FROM debts WHERE id = $1', [id]);
      const debt = debtRes.rows[0];
      if (!debt) throw new Error('Dívida não encontrada');

      const walletRes = await client.query('SELECT user_id FROM wallets WHERE id = $1', [debt.wallet_id]);
      const userId = walletRes.rows[0].user_id;

      // Cálculo de abatimento
      const amountToPay = parseFloat(paymentAmount);
      const newTotalPaid = parseFloat(debt.total_paid || 0) + amountToPay;
      const isNowPaid = newTotalPaid >= (parseFloat(debt.amount) - 0.01);

      // Atualiza Dívida
      await client.query(
        `UPDATE debts SET total_paid = $1, is_paid = $2, paid_at = $3, updated_at = NOW() WHERE id = $4`,
        [newTotalPaid, isNowPaid, isNowPaid ? new Date() : debt.paid_at, id]
      );

      // Atualiza Carteira
      const updateBalance = debt.type === 'payable'
        ? 'UPDATE wallets SET balance = balance - $1 WHERE id = $2'
        : 'UPDATE wallets SET balance = balance + $1 WHERE id = $2';
      await client.query(updateBalance, [amountToPay, debt.wallet_id]);

      // Cria Transação Vinculada (UUID para a transação também!)
      const transId = crypto.randomUUID();
      await client.query(
        `INSERT INTO transactions (id, user_id, wallet_id, debt_id, description, amount, type, transaction_date, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW(), NOW())`,
        [transId, userId, debt.wallet_id, debt.id, debt.title, amountToPay, debt.type === 'payable' ? 'expense' : 'income']
      );

      await client.query('COMMIT');
      return { message: 'Abatimento registrado!', isNowPaid, newTotalPaid };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // --- ATUALIZAÇÃO ---
  async update(id, { title, entity_name, amount, due_date }) {
    const client = await db.connect();
    try {
      await client.query('BEGIN');

      const oldDebtRes = await client.query('SELECT * FROM debts WHERE id = $1', [id]);
      const oldDebt = oldDebtRes.rows[0];
      if (!oldDebt) throw new Error('Dívida não encontrada');

      // Atualiza a Dívida
      await client.query(
        `UPDATE debts SET title = $1, entity_name = $2, amount = $3, due_date = $4, updated_at = NOW() WHERE id = $5`,
        [title, entity_name, amount, due_date, id]
      );

      // Se mudou o título, atualiza as descrições das transações vinculadas
      if (oldDebt.title !== title) {
        await client.query(
          `UPDATE transactions SET description = $1 WHERE debt_id = $2`,
          [title, id]
        );
      }

      await client.query('COMMIT');
      return { message: 'Atualizado com sucesso' };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async delete(id) {
    const client = await db.connect();
    try {
      await client.query('BEGIN');
      const debtRes = await client.query('SELECT * FROM debts WHERE id = $1', [id]);
      const debt = debtRes.rows[0];
      if (!debt) throw new Error('Dívida não encontrada');

      // 1. Estorno do saldo (Soft delete não apaga o saldo, ele "anula" a dívida)
      if (debt.total_paid > 0) {
        const rollbackBalanceQuery = debt.type === 'payable'
          ? 'UPDATE wallets SET balance = balance + $1 WHERE id = $2' 
          : 'UPDATE wallets SET balance = balance - $1 WHERE id = $2'; 
        await client.query(rollbackBalanceQuery, [debt.total_paid, debt.wallet_id]);

        // 2. Soft Delete nas transações vinculadas
        await client.query(
          "UPDATE transactions SET deleted_at = NOW(), updated_at = NOW() WHERE debt_id = $1",
          [id]
        );
      }

      // 3. Soft Delete na Dívida
      await client.query('UPDATE debts SET deleted_at = NOW(), updated_at = NOW() WHERE id = $1', [id]);

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

module.exports = new DebtRepository();