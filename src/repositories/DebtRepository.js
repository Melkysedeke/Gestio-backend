const db = require('../database/index');

class DebtRepository {

  async findAll(walletId) {
    const result = await db.query(
      'SELECT * FROM debts WHERE wallet_id = $1 ORDER BY due_date ASC',
      [walletId]
    );
    return result.rows;
  }

  async findById(id) {
    const result = await db.query('SELECT * FROM debts WHERE id = $1', [id]);
    return result.rows[0];
  }

  async create({ walletId, type, title, entityName, amount, dueDate }) {
    const result = await db.query(
      `INSERT INTO debts (wallet_id, type, title, entity_name, amount, due_date)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [walletId, type, title, entityName, amount, dueDate]
    );
    return result.rows[0];
  }

  // --- PAGAMENTO PARCIAL (CORRIGIDO: INCLUI USER_ID) ---
  async addPayment(id, paymentAmount) {
    const client = await db.connect();
    try {
      await client.query('BEGIN');

      // 1. Busca a dívida
      const debtRes = await client.query('SELECT * FROM debts WHERE id = $1', [id]);
      const debt = debtRes.rows[0];
      if (!debt) throw new Error('Dívida não encontrada');

      // 2. Busca user_id da carteira (NECESSÁRIO PARA A TRANSAÇÃO)
      const walletRes = await client.query('SELECT user_id FROM wallets WHERE id = $1', [debt.wallet_id]);
      if (walletRes.rows.length === 0) throw new Error('Carteira não encontrada');
      const userId = walletRes.rows[0].user_id;

      // 3. Busca Categoria Técnica (Dívida ou Empréstimo)
      const categoryType = 'debts'; 
      const searchName = debt.type === 'payable' ? 'Dívida' : 'Empréstimo'; 
      
      const catRes = await client.query(
        "SELECT id FROM categories WHERE type = $1 AND name ILIKE $2 LIMIT 1", 
        [categoryType, `%${searchName}%`] 
      );
      
      const categoryId = catRes.rows.length > 0 ? catRes.rows[0].id : null;

      // 4. Cálculos de valores
      const amountToPay = parseFloat(paymentAmount);
      const newTotalPaid = parseFloat(debt.total_paid || 0) + amountToPay;
      
      // Margem de erro flutuante (0.01)
      const isNowPaid = newTotalPaid >= (parseFloat(debt.amount) - 0.01);

      // 5. Atualiza a tabela de Dívidas
      await client.query(
        `UPDATE debts SET total_paid = $1, is_paid = $2, paid_at = $3, updated_at = NOW() WHERE id = $4`,
        [newTotalPaid, isNowPaid, isNowPaid ? new Date() : debt.paid_at, id]
      );

      // 6. Atualiza o Saldo da Carteira
      const updateBalance = debt.type === 'payable'
        ? 'UPDATE wallets SET balance = balance - $1 WHERE id = $2'
        : 'UPDATE wallets SET balance = balance + $1 WHERE id = $2';
      
      await client.query(updateBalance, [amountToPay, debt.wallet_id]);

      // 7. Cria Transação no Extrato (COM USER_ID e DEBT_ID)
      const transactionDesc = debt.title; 
      const transactionType = debt.type === 'payable' ? 'expense' : 'income';
      
      await client.query(
        `INSERT INTO transactions (user_id, wallet_id, category_id, debt_id, description, amount, type, transaction_date)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
        [userId, debt.wallet_id, categoryId, debt.id, transactionDesc, amountToPay, transactionType]
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

  // --- EXCLUSÃO (CORRIGIDA: Estorno também precisa de USER_ID se for criar transação de estorno) ---
  // Nota: No seu código original de delete, você estava DELETANDO as transações ("DELETE FROM transactions...").
  // Se deletar, não precisa de user_id. Se fosse criar transação de estorno ("Reembolso"), precisaria.
  // Vou manter a lógica de DELETAR o histórico para limpar a sujeira, mas estornar o saldo.

  async delete(id) {
    const client = await db.connect();
    try {
      await client.query('BEGIN');

      const debtRes = await client.query('SELECT * FROM debts WHERE id = $1', [id]);
      const debt = debtRes.rows[0];
      if (!debt) throw new Error('Dívida não encontrada');

      // 1. Estorno do valor pago (se houver) - Devolve o dinheiro pra carteira
      if (debt.total_paid > 0) {
        const rollbackBalanceQuery = debt.type === 'payable'
          ? 'UPDATE wallets SET balance = balance + $1 WHERE id = $2' 
          : 'UPDATE wallets SET balance = balance - $1 WHERE id = $2'; 
        
        await client.query(rollbackBalanceQuery, [debt.total_paid, debt.wallet_id]);

        // 2. Remove transações vinculadas PELO ID (Limpa histórico)
        await client.query(
          "DELETE FROM transactions WHERE debt_id = $1",
          [id]
        );
      }

      // 3. Remove a dívida
      await client.query('DELETE FROM debts WHERE id = $1', [id]);

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