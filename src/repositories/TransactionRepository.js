// 👇 Garanta que está apontando para o config/db correto
const db = require('../database/index');

class TransactionRepository {
  
  // Método CREATE
  async create({ walletId, categoryId, amount, type, description, date }) {
    
    // Conecta para iniciar transação (BEGIN/COMMIT)
    const client = await db.connect();
    
    try {
      await client.query('BEGIN');

      // 1. Insere a transação
      const result = await client.query(
        `INSERT INTO transactions 
        (wallet_id, category_id, type, amount, description, transaction_date)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *`,
        [walletId, categoryId, type, amount, description, date]
      );

      const transaction = result.rows[0];

      // 2. Atualiza o saldo da carteira (usando a coluna 'balance')
      if (type === 'income') {
        await client.query(
          `UPDATE wallets SET balance = balance + $1 WHERE id = $2`,
          [amount, walletId]
        );
      } else {
        await client.query(
          `UPDATE wallets SET balance = balance - $1 WHERE id = $2`,
          [amount, walletId]
        );
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

  // 👇 ESTE É O MÉTODO QUE ESTAVA FALTANDO OU COM ERRO
  async findByWallet(walletId) {
    const result = await db.query(
      `SELECT t.*, c.name as category_name, c.icon as category_icon 
       FROM transactions t
       LEFT JOIN categories c ON t.category_id = c.id
       WHERE t.wallet_id = $1 
       ORDER BY t.transaction_date DESC`,
      [walletId]
    );
    return result.rows;
  }

  // NOVO: DELETAR
  async delete(id) {
    const client = await db.connect();
    try {
      await client.query('BEGIN');

      // 1. Busca a transação para saber o valor a estornar
      const check = await client.query('SELECT * FROM transactions WHERE id = $1', [id]);
      if (check.rows.length === 0) throw new Error('Transaction not found');
      const transaction = check.rows[0];

      // 2. Reverte o saldo (Lógica Inversa)
      // Se era Receita (+), agora subtrai (-). Se era Despesa (-), agora soma (+).
      if (transaction.type === 'income') {
        await client.query(
          'UPDATE wallets SET balance = balance - $1 WHERE id = $2',
          [transaction.amount, transaction.wallet_id]
        );
      } else {
        await client.query(
          'UPDATE wallets SET balance = balance + $1 WHERE id = $2',
          [transaction.amount, transaction.wallet_id]
        );
      }

      // 3. Apaga o registro
      await client.query('DELETE FROM transactions WHERE id = $1', [id]);

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // NOVO: ATUALIZAR (Edição completa)
  async update(id, { description, amount, type, categoryId, date }) {
    const client = await db.connect();
    try {
      await client.query('BEGIN');

      // 1. Busca a antiga
      const check = await client.query('SELECT * FROM transactions WHERE id = $1', [id]);
      if (check.rows.length === 0) throw new Error('Transaction not found');
      const oldTrans = check.rows[0];

      // 2. Reverte o saldo da antiga
      if (oldTrans.type === 'income') {
        await client.query('UPDATE wallets SET balance = balance - $1 WHERE id = $2', [oldTrans.amount, oldTrans.wallet_id]);
      } else {
        await client.query('UPDATE wallets SET balance = balance + $1 WHERE id = $2', [oldTrans.amount, oldTrans.wallet_id]);
      }

      // 3. Aplica o saldo da nova
      if (type === 'income') {
        await client.query('UPDATE wallets SET balance = balance + $1 WHERE id = $2', [amount, oldTrans.wallet_id]);
      } else {
        await client.query('UPDATE wallets SET balance = balance - $1 WHERE id = $2', [amount, oldTrans.wallet_id]);
      }

      // 4. Atualiza os dados
      const result = await client.query(
        `UPDATE transactions 
         SET description = $1, amount = $2, type = $3, category_id = $4, transaction_date = $5, updated_at = NOW()
         WHERE id = $6 RETURNING *`,
        [description, amount, type, categoryId, date, id]
      );

      await client.query('COMMIT');
      return result.rows[0];

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

// Exporta uma nova instância da classe
module.exports = new TransactionRepository();