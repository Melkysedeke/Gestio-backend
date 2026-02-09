const db = require('../database/index');

class TransactionRepository {

  // LISTAR (com filtros dinâmicos)
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
    }

    query += ` ORDER BY t.transaction_date DESC`;

    const result = await db.query(query, values);
    return result.rows;
  }

  // CRIAR (com transação SQL)
  async create({ walletId, categoryId, type, amount, description, transactionDate }) {
    const client = await db.connect();
    try {
      await client.query('BEGIN');

      // 1. Insere
      const insertQuery = `
        INSERT INTO transactions (wallet_id, category_id, type, amount, description, transaction_date)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `;
      const res = await client.query(insertQuery, [walletId, categoryId, type, amount, description, transactionDate]);
      const transaction = res.rows[0];

      // 2. Atualiza Saldo
      const updateBalanceQuery = type === 'income'
        ? 'UPDATE wallets SET balance = balance + $1 WHERE id = $2'
        : 'UPDATE wallets SET balance = balance - $1 WHERE id = $2';
      
      await client.query(updateBalanceQuery, [amount, walletId]);

      await client.query('COMMIT');
      return transaction;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // ATUALIZAR (com transação SQL e estorno de saldo)
  async update(id, { amount, description, categoryId, transactionDate }) {
    const client = await db.connect();
    try {
      await client.query('BEGIN');

      // 1. Pega a antiga para estornar o saldo
      const oldRes = await client.query('SELECT * FROM transactions WHERE id = $1', [id]);
      if (oldRes.rows.length === 0) throw new Error('Transação não encontrada.');
      const oldTrans = oldRes.rows[0];

      // 2. Estorna o saldo antigo
      // Se era despesa, devolvemos (+). Se era receita, tiramos (-).
      const revertQuery = oldTrans.type === 'expense'
        ? 'UPDATE wallets SET balance = balance + $1 WHERE id = $2'
        : 'UPDATE wallets SET balance = balance - $1 WHERE id = $2';
      await client.query(revertQuery, [oldTrans.amount, oldTrans.wallet_id]);

      // 3. Atualiza os dados da transação
      const updateQuery = `
        UPDATE transactions 
        SET amount = $1, description = $2, category_id = $3, transaction_date = $4, updated_at = NOW()
        WHERE id = $5
        RETURNING *
      `;
      const res = await client.query(updateQuery, [amount, description, categoryId, transactionDate, id]);
      const newTrans = res.rows[0];

      // 4. Aplica o novo saldo
      // Se agora é despesa, tira (-). Se receita, soma (+).
      const applyQuery = newTrans.type === 'expense'
        ? 'UPDATE wallets SET balance = balance - $1 WHERE id = $2'
        : 'UPDATE wallets SET balance = balance + $1 WHERE id = $2';
      await client.query(applyQuery, [amount, newTrans.wallet_id]);

      await client.query('COMMIT');
      return newTrans;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // DELETAR (com transação SQL)
  async delete(id) {
    const client = await db.connect();
    try {
      await client.query('BEGIN');

      const check = await client.query('SELECT * FROM transactions WHERE id = $1', [id]);
      if (check.rows.length === 0) throw new Error('Transação não encontrada.');
      const trans = check.rows[0];

      // Estorna o saldo antes de deletar
      const revertQuery = trans.type === 'expense'
        ? 'UPDATE wallets SET balance = balance + $1 WHERE id = $2'
        : 'UPDATE wallets SET balance = balance - $1 WHERE id = $2';
      
      await client.query(revertQuery, [trans.amount, trans.wallet_id]);

      await client.query('DELETE FROM transactions WHERE id = $1', [id]);

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

module.exports = new TransactionRepository();