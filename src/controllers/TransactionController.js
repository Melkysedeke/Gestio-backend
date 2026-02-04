const db = require('../database/index');

class TransactionController {
  // Criar uma nova transação (Receita ou Despesa)
  create = async (req, res) => {
    const { wallet_id, category_id, type, amount, description, transaction_date } = req.body;
    const userId = req.userId;
    // Inicia um cliente para a transação do banco (evita inconsistência de saldo)
    const client = await db.connect();
    try {
      await client.query('BEGIN');
      // 1. Insere a transação
      const transactionResult = await client.query(
        `INSERT INTO transactions (wallet_id, category_id, type, amount, description, transaction_date)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [wallet_id, category_id, type, amount, description, transaction_date || new Date()]
      );
      // 2. Atualiza o saldo da carteira (Balance)
      // Se for 'income' (receita) soma, se for 'expense' (despesa) subtrai
      const updateQuery = type === 'income' 
        ? 'UPDATE wallets SET balance = balance + $1 WHERE id = $2 AND user_id = $3'
        : 'UPDATE wallets SET balance = balance - $1 WHERE id = $2 AND user_id = $3';
      await client.query(updateQuery, [amount, wallet_id, userId]);
      await client.query('COMMIT');
      return res.status(201).json(transactionResult.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Erro ao criar transação:', error);
      return res.status(500).json({ error: 'Erro ao processar transação e atualizar saldo.' });
    } finally {
      client.release();
    }
  }

  // Listar transações com filtros (essencial para os gráficos de Semana/Mês)
  index = async (req, res) => {
    const { wallet_id, startDate, endDate } = req.query;
    const userId = req.userId;
    try {
      // Busca transações da carteira do usuário em um período específico
      const result = await db.query(
        `SELECT t.*, c.name as category_name, c.icon as category_icon 
         FROM transactions t
         LEFT JOIN categories c ON c.id = t.category_id
         JOIN wallets w ON w.id = t.wallet_id
         WHERE w.user_id = $1 
         AND ($2::int IS NULL OR t.wallet_id = $2)
         AND t.transaction_date BETWEEN $3 AND $4
         ORDER BY t.transaction_date DESC`,
        [userId, wallet_id, startDate || '1900-01-01', endDate || '2100-01-01']
      );
      return res.json(result.rows);
    } catch (error) {
      return res.status(500).json({ error: 'Erro ao buscar transações.' });
    }
  }

  update = async (req, res) => {
    const { id } = req.params;
    // 1. ADICIONADO: category_id e transaction_date na desestruturação
    const { amount, description, category_id, transaction_date } = req.body;
    const client = await db.connect();

    try {
      await client.query('BEGIN');

      const oldTransRes = await client.query('SELECT * FROM transactions WHERE id = $1', [id]);
      const oldTrans = oldTransRes.rows[0];
      if (!oldTrans) return res.status(404).json({ error: 'Transação não encontrada' });

      const diff = Number(amount) - Number(oldTrans.amount);

      // Lógica de Sincronização com Dívidas/Empréstimos
      const isDebtAction = oldTrans.description.startsWith('Dívida:') || 
                          oldTrans.description.startsWith('Empréstimo:');

      if (isDebtAction) {
        const debtTitle = oldTrans.description.split(': ')[1];
        
        await client.query(
          `UPDATE debts 
          SET total_paid = total_paid + $1,
              is_paid = (total_paid + $1 >= amount),
              updated_at = NOW()
          WHERE wallet_id = $2 AND title = $3`,
          [diff, oldTrans.wallet_id, debtTitle]
        );
      }

      // 2. CORRIGIDO: Agora a query de UPDATE inclui transaction_date e category_id
      await client.query(
        `UPDATE transactions 
         SET amount = $1, 
             description = $2, 
             category_id = $3, 
             transaction_date = $4, 
             updated_at = NOW() 
         WHERE id = $5`,
        [amount, description, category_id, transaction_date, id]
      );

      // 3. Atualiza o saldo da carteira com base na diferença (diff)
      const updateWallet = oldTrans.type === 'expense' 
        ? 'UPDATE wallets SET balance = balance - $1 WHERE id = $2'
        : 'UPDATE wallets SET balance = balance + $1 WHERE id = $2';
      
      await client.query(updateWallet, [diff, oldTrans.wallet_id]);

      await client.query('COMMIT');
      res.json({ message: 'Transação e data atualizadas com sucesso!' });
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Erro no update:', error.message);
      res.status(500).json({ error: error.message });
    } finally {
      client.release();
    }
  }

  destroy = async (req, res) => {
    const { id } = req.params;
    const client = await db.connect();

    try {
      await client.query('BEGIN');

      const transRes = await client.query('SELECT * FROM transactions WHERE id = $1', [id]);
      const trans = transRes.rows[0];
      if (!trans) return res.status(404).json({ error: 'Transação não encontrada' });

      // AJUSTE AQUI: Mesma lógica de detecção de prefixo
      const isDebtAction = trans.description.startsWith('Dívida:') || 
                          trans.description.startsWith('Empréstimo:');

      if (isDebtAction) {
        const debtTitle = trans.description.split(': ')[1];
        
        await client.query(
          `UPDATE debts 
          SET total_paid = total_paid - $1,
              is_paid = false,
              paid_at = NULL,
              updated_at = NOW()
          WHERE wallet_id = $2 AND title = $3`,
          [trans.amount, trans.wallet_id, debtTitle]
        );
      }

      const refundWallet = trans.type === 'expense'
        ? 'UPDATE wallets SET balance = balance + $1 WHERE id = $2'
        : 'UPDATE wallets SET balance = balance - $1 WHERE id = $2';
      
      await client.query(refundWallet, [trans.amount, trans.wallet_id]);

      await client.query('DELETE FROM transactions WHERE id = $1', [id]);

      await client.query('COMMIT');
      res.status(204).send();
    } catch (error) {
      await client.query('ROLLBACK');
      res.status(500).json({ error: error.message });
    } finally {
      client.release();
    }
  }

  delete = async (req, res) => {
    const { id } = req.params;
    const userId = req.userId;
    const client = await db.connect();

    try {
      await client.query('BEGIN');

      const transRes = await client.query(
        'SELECT amount, type, wallet_id, description FROM transactions WHERE id = $1', [id]
      );

      if (transRes.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Não encontrada' });
      }

      const { amount, type, wallet_id, description } = transRes.rows[0];

      const isDebtAction = description?.startsWith('Dívida:') || description?.startsWith('Empréstimo:');

      if (isDebtAction) {
        const debtTitle = description.split(': ')[1];
        
        await client.query(
          `UPDATE debts 
           SET total_paid = total_paid - $1,
               is_paid = false,
               paid_at = NULL,
               updated_at = NOW()
           WHERE wallet_id = $2 AND title = $3`,
          [amount, wallet_id, debtTitle]
        );
      }

      const updateQuery = type === 'income'
        ? 'UPDATE wallets SET balance = balance - $1 WHERE id = $2 AND user_id = $3'
        : 'UPDATE wallets SET balance = balance + $1 WHERE id = $2 AND user_id = $3';

      await client.query(updateQuery, [amount, wallet_id, userId]);

      await client.query('DELETE FROM transactions WHERE id = $1', [id]);

      await client.query('COMMIT');
      return res.json({ message: 'Removida com sucesso.' });
    } catch (error) {
      await client.query('ROLLBACK');
      return res.status(500).json({ error: 'Erro ao deletar' });
    } finally {
      client.release();
    }
  }
}

module.exports = new TransactionController();