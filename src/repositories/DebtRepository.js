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

  // Lógica complexa de pagamento parcial
  async addPayment(id, paymentAmount) {
    const client = await db.connect();
    try {
      await client.query('BEGIN');

      // 1. Busca a dívida
      const debtRes = await client.query('SELECT * FROM debts WHERE id = $1', [id]);
      const debt = debtRes.rows[0];
      if (!debt) throw new Error('Dívida não encontrada');

      // 2. Busca Categoria (Dívida ou Empréstimo) para vincular corretamente
      const categoryName = debt.type === 'payable' ? 'Dívida' : 'Empréstimo';
      
      const catRes = await client.query(
        "SELECT id FROM categories WHERE name = $1 LIMIT 1", 
        [categoryName] 
      );
      
      const categoryId = catRes.rows.length > 0 ? catRes.rows[0].id : null;

      // 3. Cálculos de valores
      const amountToPay = parseFloat(paymentAmount);
      const newTotalPaid = parseFloat(debt.total_paid || 0) + amountToPay;
      
      // Considera pago se faltar menos de 1 centavo (margem de erro flutuante)
      const isNowPaid = newTotalPaid >= (parseFloat(debt.amount) - 0.01);

      // 4. Atualiza a tabela de Dívidas
      await client.query(
        `UPDATE debts SET total_paid = $1, is_paid = $2, paid_at = $3, updated_at = NOW() WHERE id = $4`,
        [newTotalPaid, isNowPaid, isNowPaid ? new Date() : debt.paid_at, id]
      );

      // 5. Atualiza o Saldo da Carteira
      const updateBalance = debt.type === 'payable'
        ? 'UPDATE wallets SET balance = balance - $1 WHERE id = $2'
        : 'UPDATE wallets SET balance = balance + $1 WHERE id = $2';
      
      await client.query(updateBalance, [amountToPay, debt.wallet_id]);

      // 6. Cria Transação no Extrato
      // --- ALTERAÇÃO AQUI: Usamos apenas o título original, sem prefixos ---
      const transactionDesc = debt.title; 
      const transactionType = debt.type === 'payable' ? 'expense' : 'income';
      
      await client.query(
        `INSERT INTO transactions (wallet_id, category_id, description, amount, type, transaction_date)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [debt.wallet_id, categoryId, transactionDesc, amountToPay, transactionType]
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

  async update(id, { title, entity_name, amount, due_date }) {
    const client = await db.connect();
    try {
      await client.query('BEGIN');

      const oldDebtRes = await client.query('SELECT * FROM debts WHERE id = $1', [id]);
      const oldDebt = oldDebtRes.rows[0];
      if (!oldDebt) throw new Error('Dívida não encontrada');

      // Atualiza Dívida
      await client.query(
        `UPDATE debts SET title = $1, entity_name = $2, amount = $3, due_date = $4, updated_at = NOW() WHERE id = $5`,
        [title, entity_name, amount, due_date, id]
      );

      // Se mudou o título, atualiza as transações vinculadas (Opcional, mas estava no seu código original)
      if (oldDebt.title !== title) {
        const oldDesc = oldDebt.type === 'payable' ? `Pgto Dívida: ${oldDebt.title}` : `Receb. Empréstimo: ${oldDebt.title}`;
        const newDesc = oldDebt.type === 'payable' ? `Pgto Dívida: ${title}` : `Receb. Empréstimo: ${title}`;
        
        // Usando LIKE para pegar variações ou match exato
        await client.query(
          `UPDATE transactions SET description = $1 WHERE description = $2`,
          [newDesc, oldDesc]
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

      // Se já foi paga (total ou parcial), precisamos estornar o dinheiro para a carteira
      if (debt.total_paid > 0) {
        const rollbackBalanceQuery = debt.type === 'payable'
          ? 'UPDATE wallets SET balance = balance + $1 WHERE id = $2' // Devolve dinheiro
          : 'UPDATE wallets SET balance = balance - $1 WHERE id = $2'; // Retira dinheiro
        
        await client.query(rollbackBalanceQuery, [debt.total_paid, debt.wallet_id]);

        // Remove transações vinculadas a esta dívida pelo nome padrão
        // Atenção: Isso apaga o histórico de pagamentos dessa dívida
        const searchDesc = debt.type === 'payable' ? `Pgto Dívida: ${debt.title}` : `Receb. Empréstimo: ${debt.title}`;
        await client.query(
          "DELETE FROM transactions WHERE wallet_id = $1 AND description = $2",
          [debt.wallet_id, searchDesc]
        );
      }

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