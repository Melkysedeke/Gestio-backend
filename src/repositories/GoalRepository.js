const db = require('../database/index');

class GoalRepository {
  
  async findAll(walletId) {
    const result = await db.query(
      'SELECT * FROM goals WHERE wallet_id = $1 ORDER BY is_completed ASC, deadline ASC',
      [walletId]
    );
    return result.rows;
  }

  async create({ walletId, name, targetAmount, deadline, color }) {
    const result = await db.query(
      `INSERT INTO goals (wallet_id, name, target_amount, deadline, color)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [walletId, name, targetAmount, deadline, color]
    );
    return result.rows[0];
  }

  async update(id, { name, targetAmount, deadline, color }) {
    const client = await db.connect();
    try {
      await client.query('BEGIN');

      // Busca o objetivo atual para comparar saldo vs nova meta
      const currentRes = await client.query('SELECT current_amount FROM goals WHERE id = $1', [id]);
      const currentAmount = parseFloat(currentRes.rows[0].current_amount);
      
      // Recalcula se está completo com base na NOVA meta
      const isCompleted = currentAmount >= parseFloat(targetAmount);

      const result = await db.query(
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

  // --- DEPÓSITO (Tira da Carteira -> Põe no Objetivo) ---
  async deposit(id, amount) {
    const client = await db.connect();
    try {
      await client.query('BEGIN');

      // 1. Busca o Objetivo para saber qual é a carteira
      const goalRes = await client.query('SELECT * FROM goals WHERE id = $1', [id]);
      const goal = goalRes.rows[0];
      if (!goal) throw new Error('Objetivo não encontrado');

      // 2. Verifica se a carteira tem saldo
      const walletRes = await client.query('SELECT balance FROM wallets WHERE id = $1', [goal.wallet_id]);
      const currentBalance = parseFloat(walletRes.rows[0].balance);
      
      if (currentBalance < amount) {
        throw new Error('Saldo insuficiente na carteira para realizar este depósito.');
      }

      // 3. Atualiza Objetivo (+ Dinheiro)
      const newAmount = parseFloat(goal.current_amount) + parseFloat(amount);
      const isCompleted = newAmount >= parseFloat(goal.target_amount);

      await client.query(
        'UPDATE goals SET current_amount = $1, is_completed = $2, updated_at = NOW() WHERE id = $3',
        [newAmount, isCompleted, id]
      );

      // 4. Atualiza Carteira (- Dinheiro)
      await client.query(
        'UPDATE wallets SET balance = balance - $1 WHERE id = $2',
        [amount, goal.wallet_id]
      );

      // 5. Gera Histórico (Transação de Despesa)
      // Usamos uma categoria "dummy" ou NULL, mas com descrição clara
      await client.query(
        `INSERT INTO transactions (wallet_id, description, amount, type, transaction_date)
         VALUES ($1, $2, $3, 'expense', NOW())`,
        [goal.wallet_id, `Guardado: ${goal.name}`, amount]
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

  // --- RESGATE (Tira do Objetivo -> Devolve pra Carteira) ---
  async withdraw(id, amount) {
    const client = await db.connect();
    try {
      await client.query('BEGIN');

      const goalRes = await client.query('SELECT * FROM goals WHERE id = $1', [id]);
      const goal = goalRes.rows[0];
      if (!goal) throw new Error('Objetivo não encontrado');

      if (parseFloat(goal.current_amount) < amount) {
        throw new Error('O valor do resgate é maior que o saldo acumulado no objetivo.');
      }

      // 1. Atualiza Objetivo (- Dinheiro)
      const newAmount = parseFloat(goal.current_amount) - parseFloat(amount);
      // Se tirou dinheiro, pode deixar de estar "completo"
      const isCompleted = newAmount >= parseFloat(goal.target_amount) && newAmount > 0;

      await client.query(
        'UPDATE goals SET current_amount = $1, is_completed = $2, updated_at = NOW() WHERE id = $3',
        [newAmount, isCompleted, id]
      );

      // 2. Atualiza Carteira (+ Dinheiro)
      await client.query(
        'UPDATE wallets SET balance = balance + $1 WHERE id = $2',
        [amount, goal.wallet_id]
      );

      // 3. Gera Histórico (Transação de Receita)
      await client.query(
        `INSERT INTO transactions (wallet_id, description, amount, type, transaction_date)
         VALUES ($1, $2, $3, 'income', NOW())`,
        [goal.wallet_id, `Resgate: ${goal.name}`, amount]
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
    // Se deletar o objetivo, o dinheiro que estava lá deve voltar pra carteira?
    // Lógica de segurança: só deixa deletar e estornar o saldo restante.
    const client = await db.connect();
    try {
      await client.query('BEGIN');
      
      const goalRes = await client.query('SELECT * FROM goals WHERE id = $1', [id]);
      const goal = goalRes.rows[0];
      
      if (goal && parseFloat(goal.current_amount) > 0) {
         // Devolve o saldo restante para a carteira antes de apagar
         await client.query(
            'UPDATE wallets SET balance = balance + $1 WHERE id = $2',
            [goal.current_amount, goal.wallet_id]
         );
         // Registra o estorno
         await client.query(
            `INSERT INTO transactions (wallet_id, description, amount, type, transaction_date)
             VALUES ($1, $2, $3, 'income', NOW())`,
            [goal.wallet_id, `Estorno Exclusão: ${goal.name}`, goal.current_amount]
         );
      }

      await client.query('DELETE FROM goals WHERE id = $1', [id]);
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