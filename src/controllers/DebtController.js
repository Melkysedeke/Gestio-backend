const db = require('../database/index');

class DebtController {
  // Listar dívidas da carteira
  index = async (req, res) => {
    const { wallet_id } = req.query;
    try {
      const result = await db.query(
        'SELECT * FROM debts WHERE wallet_id = $1 ORDER BY due_date ASC',
        [wallet_id]
      );
      return res.json(result.rows);
    } catch (error) {
      return res.status(500).json({ error: 'Erro ao buscar dívidas' });
    }
  }

  store = async (req, res) => {
    const { wallet_id, type, title, entity_name, amount, due_date } = req.body;

    try {
      const result = await db.query(
        `INSERT INTO debts 
          (wallet_id, type, title, entity_name, amount, due_date)
        VALUES ($1, $2, $3, $4, $5, $6) 
        RETURNING *`,
        [wallet_id, type, title, entity_name, amount, due_date]
      );

      return res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error("ERRO NO POST DEBTS:", error.message); // Verifique isso no terminal do PC
      return res.status(500).json({ error: 'Erro interno ao salvar dívida' });
    }
  }

  // Pagamento parcial de dívida ou empréstimo
  deposit = async (req, res) => {
    const { id } = req.params;
    const { paymentAmount } = req.body;
    const client = await db.connect();

    try {
      await client.query('BEGIN');
      const debtRes = await client.query('SELECT * FROM debts WHERE id = $1', [id]);
      const debt = debtRes.rows[0];
      if (!debt) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Dívida não encontrada' });
      }
      const categoryName = debt.type === 'payable' ? 'Dívida' : 'Empréstimo';
      const catRes = await client.query(
        "SELECT id FROM categories WHERE name = $1 AND type = 'debts' LIMIT 1",
        [categoryName]
      );
      const categoryId = catRes.rows.length > 0 ? catRes.rows[0].id : null;
      const amountToPay = parseFloat(paymentAmount);
      const newTotalPaid = parseFloat(debt.total_paid || 0) + amountToPay;
      const isNowPaid = newTotalPaid >= (parseFloat(debt.amount) - 0.01);
      await client.query(
        `UPDATE debts SET total_paid = $1, is_paid = $2, paid_at = $3, updated_at = NOW() WHERE id = $4`,
        [newTotalPaid, isNowPaid, isNowPaid ? new Date() : debt.paid_at, id]
      );
      const updateBalance = debt.type === 'payable'
        ? 'UPDATE wallets SET balance = balance - $1 WHERE id = $2'
        : 'UPDATE wallets SET balance = balance + $1 WHERE id = $2';
      
      await client.query(updateBalance, [amountToPay, debt.wallet_id]);
      const transactionDesc = debt.type === 'payable' ? `Dívida: ${debt.title}` : `Empréstimo: ${debt.title}`;
      const transactionType = debt.type === 'payable' ? 'expense' : 'income';
      await client.query(
        `INSERT INTO transactions (wallet_id, category_id, description, amount, type, transaction_date)
        VALUES ($1, $2, $3, $4, $5, NOW())`,
        [debt.wallet_id, categoryId, transactionDesc, amountToPay, transactionType]
      );

      await client.query('COMMIT');
      res.json({ message: 'Abatimento registrado com sucesso!', isNowPaid });
    } catch (error) {
      await client.query('ROLLBACK');
      console.error(error);
      res.status(500).json({ error: 'Erro ao processar abatimento: ' + error.message });
    } finally {
      client.release();
    }
  }

  show = async (req, res) => {
    const { id } = req.params;
    try {
      const result = await db.query(
        'SELECT * FROM debts WHERE id = $1',
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Dívida não encontrada' });
      }

      return res.json(result.rows[0]);
    } catch (error) {
      console.error("Erro ao buscar dívida:", error.message);
      return res.status(500).json({ error: 'Erro interno ao buscar dados' });
    }
  }

  update = async (req, res) => {
    const { id } = req.params;
    const { title, entity_name, amount, due_date } = req.body;
    const client = await db.connect();
    try {
      await client.query('BEGIN');
      const oldDebtRes = await client.query('SELECT title, type FROM debts WHERE id = $1', [id]);
      const oldDebt = oldDebtRes.rows[0];

      if (!oldDebt) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Dívida não encontrada' });
      }
      await client.query(
        `UPDATE debts SET 
          title = $1, 
          entity_name = $2, 
          amount = $3, 
          due_date = $4, 
          updated_at = NOW() 
        WHERE id = $5`,
        [title, entity_name, amount, due_date, id]
      );
      if (oldDebt.title !== title) {
        const oldPrefix = oldDebt.type === 'payable' ? `Dívida: ${oldDebt.title}` : `Empréstimo: ${oldDebt.title}`;
        const newPrefix = oldDebt.type === 'payable' ? `Dívida: ${title}` : `Empréstimo: ${title}`;
        await client.query(
          `UPDATE transactions 
          SET description = $1 
          WHERE description = $2`,
          [newPrefix, oldPrefix]
        );
      }
      await client.query('COMMIT');
      res.json({ message: 'Dívida e transações vinculadas atualizadas com sucesso!' });
    } catch (error) {
      await client.query('ROLLBACK');
      console.error("ERRO AO ATUALIZAR DÍVIDA:", error.message);
      res.status(500).json({ error: 'Erro ao atualizar: ' + error.message });
    } finally {
      client.release();
    }
  }

  delete = async (req, res) => {
    const { id } = req.params;
    const client = await db.connect();

    try {
      await client.query('BEGIN');
      const debtRes = await client.query('SELECT * FROM debts WHERE id = $1', [id]);
      const debt = debtRes.rows[0];
      if (!debt) return res.status(404).json({ error: 'Dívida não encontrada' });
      if (debt.is_paid) {
        const rollbackBalanceQuery = debt.type === 'payable'
          ? 'UPDATE wallets SET balance = balance + $1 WHERE id = $2' // Devolve o que saiu
          : 'UPDATE wallets SET balance = balance - $1 WHERE id = $2'; // Tira o que entrou
        await client.query(rollbackBalanceQuery, [debt.amount, debt.wallet_id]);
        await client.query(
          "DELETE FROM transactions WHERE wallet_id = $1 AND description = $2 AND amount = $3",
          [debt.wallet_id, `Pgto: ${debt.title}`, debt.amount]
        );
      }
      await client.query('DELETE FROM debts WHERE id = $1', [id]);
      await client.query('COMMIT');
      return res.status(204).send();
    } catch (error) {
      await client.query('ROLLBACK');
      console.error(error);
      return res.status(500).json({ error: 'Erro ao excluir e estornar dívida' });
    } finally {
      client.release();
    }
  }
}

module.exports = new DebtController();