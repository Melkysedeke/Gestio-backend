const db = require('../database/index');

class GoalRepository {
  
  async findAll(walletId) {
    // 🚀 Filtra por deleted_at IS NULL
    const result = await db.query(
      'SELECT * FROM goals WHERE wallet_id = $1 AND deleted_at IS NULL ORDER BY is_completed ASC, deadline ASC',
      [walletId]
    );
    return result.rows;
  }

  async findById(id) {
    const result = await db.query('SELECT * FROM goals WHERE id = $1', [id]);
    return result.rows[0];
  }

  async create({ id, walletId, name, targetAmount, deadline, color }) {
    // 🚀 Aceita o ID do WatermelonDB
    const goalId = id || crypto.randomUUID();

    const result = await db.query(
      `INSERT INTO goals (id, wallet_id, name, target_amount, deadline, color, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
       RETURNING *`,
      [goalId, walletId, name, targetAmount, deadline, color]
    );
    return result.rows[0];
  }

  async update(id, { name, targetAmount, deadline, color }) {
    const client = await db.connect();
    try {
      await client.query('BEGIN');

      const currentRes = await client.query('SELECT current_amount FROM goals WHERE id = $1', [id]);
      if (currentRes.rows.length === 0) throw new Error('Objetivo não encontrado');
      
      const currentAmount = parseFloat(currentRes.rows[0].current_amount);
      const isCompleted = currentAmount >= parseFloat(targetAmount);

      const result = await client.query(
        `UPDATE goals 
         SET name = $1, target_amount = $2, deadline = $3, color = $4, is_completed = $5, updated_at = NOW()
         WHERE id = $6
         RETURNING *`,
        [name, targetAmount, deadline, color, isCompleted, id]
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

  async deposit(id, amount) {
    const client = await db.connect();
    try {
      await client.query('BEGIN');

      const goalRes = await client.query('SELECT * FROM goals WHERE id = $1', [id]);
      const goal = goalRes.rows[0];
      if (!goal) throw new Error('Objetivo não encontrado');

      const walletRes = await client.query('SELECT user_id FROM wallets WHERE id = $1', [goal.wallet_id]);
      const userId = walletRes.rows[0].user_id;

      // Cálculo
      const newAmount = parseFloat(goal.current_amount) + parseFloat(amount);
      const isCompleted = newAmount >= parseFloat(goal.target_amount);

      await client.query(
        'UPDATE goals SET current_amount = $1, is_completed = $2, updated_at = NOW() WHERE id = $3',
        [newAmount, isCompleted, id]
      );

      await client.query(
        'UPDATE wallets SET balance = balance - $1 WHERE id = $2',
        [amount, goal.wallet_id]
      );

      // 🚀 Cria Transação com UUID
      const transId = crypto.randomUUID();
      await client.query(
        `INSERT INTO transactions (id, user_id, wallet_id, goal_id, description, amount, type, transaction_date, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, 'expense', NOW(), NOW(), NOW())`,
        [transId, userId, goal.wallet_id, goal.id, `Objetivo: ${goal.name}`, amount]
      );

      await client.query('COMMIT');
      return { success: true, newAmount, isCompleted };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async withdraw(id, amount) {
    const client = await db.connect();
    try {
      await client.query('BEGIN');

      const goalRes = await client.query('SELECT * FROM goals WHERE id = $1', [id]);
      const goal = goalRes.rows[0];
      if (!goal) throw new Error('Objetivo não encontrado');

      const walletRes = await client.query('SELECT user_id FROM wallets WHERE id = $1', [goal.wallet_id]);
      const userId = walletRes.rows[0].user_id;

      if (parseFloat(goal.current_amount) < amount) {
        throw new Error('Saldo insuficiente no objetivo.');
      }

      // 1. BUSCA CATEGORIA "RESGATE"
      let catRes = await client.query(
        "SELECT id FROM categories WHERE type = 'investment' AND name ILIKE 'Resgat%' LIMIT 1"
      );
      
      if (catRes.rows.length === 0) {
          catRes = await client.query("SELECT id FROM categories WHERE type = 'investment' LIMIT 1");
      }
      
      const categoryId = catRes.rows.length > 0 ? catRes.rows[0].id : null;

      // Atualiza Goal e Wallet...
      const newAmount = parseFloat(goal.current_amount) - parseFloat(amount);
      const isCompleted = newAmount >= parseFloat(goal.target_amount) && newAmount > 0;

      await client.query(
        'UPDATE goals SET current_amount = $1, is_completed = $2, updated_at = NOW() WHERE id = $3',
        [newAmount, isCompleted, id]
      );

      await client.query(
        'UPDATE wallets SET balance = balance + $1 WHERE id = $2',
        [amount, goal.wallet_id]
      );

      // Cria Transação
      await client.query(
        `INSERT INTO transactions (user_id, wallet_id, goal_id, category_id, description, amount, type, transaction_date)
         VALUES ($1, $2, $3, $4, $5, $6, 'income', NOW())`,
        [userId, goal.wallet_id, goal.id, categoryId, `Objetivo: ${goal.name}`, amount]
      );

      await client.query('COMMIT');
      return { success: true, newAmount, isCompleted };

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
      const goalRes = await client.query('SELECT * FROM goals WHERE id = $1', [id]);
      const goal = goalRes.rows[0];

      if (goal && parseFloat(goal.current_amount) > 0) {
        const walletRes = await client.query('SELECT user_id FROM wallets WHERE id = $1', [goal.wallet_id]);
        const userId = walletRes.rows[0].user_id;
        
        // Estorno
        await client.query('UPDATE wallets SET balance = balance + $1 WHERE id = $2', [goal.current_amount, goal.wallet_id]);
        
        const transId = crypto.randomUUID();
        await client.query(
          `INSERT INTO transactions (id, user_id, wallet_id, description, amount, type, transaction_date, created_at, updated_at)
           VALUES ($1, $2, $3, $4, 'income', NOW(), NOW(), NOW())`,
          [transId, userId, goal.wallet_id, `Estorno: ${goal.name}`, goal.current_amount]
        );
      }

      // 🚀 Soft Delete
      await client.query('UPDATE goals SET deleted_at = NOW(), updated_at = NOW() WHERE id = $1', [id]);
      
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

module.exports = new GoalRepository();