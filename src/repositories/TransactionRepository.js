const db = require('../database/index');

class TransactionRepository {
  async findAll({ userId, walletId, startDate, endDate }) {
    let query = `
      SELECT t.*, c.name as category_name, c.icon as category_icon, c.color as category_color
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      JOIN wallets w ON t.wallet_id = w.id
      WHERE w.user_id = $1
    `;
    
    const values = [userId];
    let paramIndex = 2;

    if (walletId) {
      query += ` AND t.wallet_id = $${paramIndex}`;
      values.push(walletId);
      paramIndex++;
    }

    if (startDate && endDate) {
      query += ` AND t.transaction_date BETWEEN $${paramIndex} AND $${paramIndex + 1}`;
      values.push(startDate, endDate);
      paramIndex += 2;
    }

    query += ` ORDER BY t.transaction_date DESC`;

    const result = await db.query(query, values);
    return result.rows;
  }

  // BUSCAR POR ID
  async findById(id) {
    const result = await db.query('SELECT * FROM transactions WHERE id = $1', [id]);
    return result.rows[0];
  }

  // CRIAR
  // Adicionado userId (obrigatório no banco) e goalId
  async create({ userId, walletId, categoryId, type, amount, description, transactionDate, debtId = null, goalId = null }) {
    const client = await db.connect();
    try {
      await client.query('BEGIN');

      // 1. Insere (Incluindo user_id, debt_id e goal_id)
      const insertQuery = `
        INSERT INTO transactions (user_id, wallet_id, category_id, type, amount, description, transaction_date, debt_id, goal_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `;
      const res = await client.query(insertQuery, [userId, walletId, categoryId, type, amount, description, transactionDate, debtId, goalId]);
      const transaction = res.rows[0];

      // 2. Atualiza Saldo da Carteira
      const updateBalanceQuery = type === 'income'
        ? 'UPDATE wallets SET balance = balance + $1 WHERE id = $2'
        : 'UPDATE wallets SET balance = balance - $1 WHERE id = $2';
      
      await client.query(updateBalanceQuery, [amount, walletId]);

      // 3. Atualiza Dívida (se houver)
      if (debtId) {
         await this._recalculateDebtProgress(client, debtId);
      }

      // 4. Atualiza Objetivo (se houver)
      if (goalId) {
         await this._recalculateGoalBalance(client, goalId);
      }

      await client.query('COMMIT');
      return transaction;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // ATUALIZAR
  async update(id, { wallet_id, category_id, type, amount, description, transaction_date, debt_id, goal_id }) {
    const client = await db.connect();
    try {
        await client.query('BEGIN');

        // 1. Busca transação antiga
        const oldTransRes = await client.query('SELECT * FROM transactions WHERE id = $1', [id]);
        const oldTrans = oldTransRes.rows[0];
        if (!oldTrans) throw new Error('Transação não encontrada');

        // --- FALLBACKS ---
        const finalWalletId = wallet_id || oldTrans.wallet_id;
        const finalCategoryId = category_id || oldTrans.category_id;
        const finalType = type || oldTrans.type;
        const finalAmount = amount !== undefined ? amount : oldTrans.amount;
        const finalDate = transaction_date || oldTrans.transaction_date;
        const finalDesc = description !== undefined ? description : oldTrans.description;
        
        // IDs opcionais: undefined mantém o antigo. null remove o vínculo.
        const finalDebtId = debt_id !== undefined ? debt_id : oldTrans.debt_id;
        const finalGoalId = goal_id !== undefined ? goal_id : oldTrans.goal_id;

        // 2. Reverte saldo da carteira antiga
        const revertOldBalance = oldTrans.type === 'income'
            ? 'UPDATE wallets SET balance = balance - $1 WHERE id = $2'
            : 'UPDATE wallets SET balance = balance + $1 WHERE id = $2';
        await client.query(revertOldBalance, [oldTrans.amount, oldTrans.wallet_id]);

        // 3. Atualiza a transação
        const result = await client.query(
            `UPDATE transactions 
             SET wallet_id = $1, category_id = $2, type = $3, amount = $4, description = $5, transaction_date = $6, debt_id = $7, goal_id = $8
             WHERE id = $9 RETURNING *`,
            [
              finalWalletId, 
              finalCategoryId, 
              finalType, 
              finalAmount, 
              finalDesc, 
              finalDate, 
              finalDebtId,
              finalGoalId, // Novo campo
              id
            ]
        );
        const updatedTransaction = result.rows[0];

        // 4. Aplica novo saldo na carteira nova
        const applyNewBalance = finalType === 'income'
            ? 'UPDATE wallets SET balance = balance + $1 WHERE id = $2'
            : 'UPDATE wallets SET balance = balance - $1 WHERE id = $2';
        await client.query(applyNewBalance, [finalAmount, finalWalletId]);

        // 5. Recalcula DÍVIDAS (Atual e Antiga se mudou)
        if (updatedTransaction.debt_id) {
            await this._recalculateDebtProgress(client, updatedTransaction.debt_id);
        }
        if (oldTrans.debt_id && oldTrans.debt_id !== updatedTransaction.debt_id) {
             await this._recalculateDebtProgress(client, oldTrans.debt_id);
        }

        // 6. Recalcula OBJETIVOS (Atual e Antigo se mudou)
        if (updatedTransaction.goal_id) {
            await this._recalculateGoalBalance(client, updatedTransaction.goal_id);
        }
        if (oldTrans.goal_id && oldTrans.goal_id !== updatedTransaction.goal_id) {
             await this._recalculateGoalBalance(client, oldTrans.goal_id);
        }

        await client.query('COMMIT');
        return updatedTransaction;
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
  }

  // DELETAR
  async delete(id) {
    const client = await db.connect();
    try {
      await client.query('BEGIN');

      const check = await client.query('SELECT * FROM transactions WHERE id = $1', [id]);
      if (check.rows.length === 0) throw new Error('Transação não encontrada.');
      const trans = check.rows[0];

      // 1. Estorna o saldo da carteira
      const revertQuery = trans.type === 'expense'
        ? 'UPDATE wallets SET balance = balance + $1 WHERE id = $2'
        : 'UPDATE wallets SET balance = balance - $1 WHERE id = $2';
      
      await client.query(revertQuery, [trans.amount, trans.wallet_id]);

      // 2. Deleta a transação
      await client.query('DELETE FROM transactions WHERE id = $1', [id]);

      // 3. Recalcula DÍVIDA
      if (trans.debt_id) {
          await this._recalculateDebtProgress(client, trans.debt_id);
      }

      // 4. Recalcula OBJETIVO
      if (trans.goal_id) {
          await this._recalculateGoalBalance(client, trans.goal_id);
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // --- Helper Interno Dívida ---
  async _recalculateDebtProgress(client, debtId) {
    const sumRes = await client.query(
        `SELECT SUM(amount) as total_paid FROM transactions WHERE debt_id = $1`,
        [debtId]
    );
    const totalPaid = parseFloat(sumRes.rows[0].total_paid || 0);
    const debtRes = await client.query('SELECT amount FROM debts WHERE id = $1', [debtId]);
    if (debtRes.rows.length > 0) {
      const debt = debtRes.rows[0];
      const isPaid = totalPaid >= (parseFloat(debt.amount) - 0.01);
      await client.query(
          `UPDATE debts SET total_paid = $1, is_paid = $2, updated_at = NOW() WHERE id = $3`,
          [totalPaid, isPaid, debtId]
      );
    }
  }

  // --- Helper Interno Objetivo (NOVO) ---
  async _recalculateGoalBalance(client, goalId) {
      // Regra do Objetivo:
      // Transação 'expense' (Despesa na Carteira) = DINHEIRO ENTRANDO NO OBJETIVO (Depósito)
      // Transação 'income' (Receita na Carteira) = DINHEIRO SAINDO DO OBJETIVO (Resgate)

      // 1. Soma Depósitos
      const depositsRes = await client.query(
          `SELECT SUM(amount) as total FROM transactions WHERE goal_id = $1 AND type = 'expense'`, 
          [goalId]
      );
      const totalDeposits = parseFloat(depositsRes.rows[0].total || 0);

      // 2. Soma Resgates
      const withdrawsRes = await client.query(
          `SELECT SUM(amount) as total FROM transactions WHERE goal_id = $1 AND type = 'income'`, 
          [goalId]
      );
      const totalWithdraws = parseFloat(withdrawsRes.rows[0].total || 0);

      // 3. Saldo Líquido
      const currentAmount = totalDeposits - totalWithdraws;

      // 4. Atualiza Goal e status de conclusão
      const goalRes = await client.query('SELECT target_amount FROM goals WHERE id = $1', [goalId]);
      if (goalRes.rows.length > 0) {
          const target = parseFloat(goalRes.rows[0].target_amount);
          const isCompleted = currentAmount >= target;

          await client.query(
              `UPDATE goals SET current_amount = $1, is_completed = $2, updated_at = NOW() WHERE id = $3`,
              [currentAmount, isCompleted, goalId]
          );
      }
  }
}

module.exports = new TransactionRepository();