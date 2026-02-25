const walletRepository = require('../repositories/WalletRepository');
const db = require('../database/index'); 

class WalletService {
  async create({ userId, name, balance, color }) {
    // 1. Validação simples
    if (!userId) throw new Error("Usuário não identificado.");
    // 2. Chamada ao repositório garantindo os nomes das colunas
    const newWallet = await walletRepository.create({
      userId: userId,
      name,
      balance: balance || 0,
      color
    });
    return newWallet;
  }

  async listWallets(userId) {
    try {
      // Usamos CURRENT_DATE + '23:59:59' para incluir tudo que foi gasto HOJE
      const query = `
        SELECT 
          w.*,
          COALESCE(
            (SELECT SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE -t.amount END)
             FROM transactions t
             WHERE t.wallet_id = w.id 
             AND t.transaction_date <= (CURRENT_DATE + interval '1 day' - interval '1 second')), 
          0) + w.balance AS current_balance
        FROM wallets w
        WHERE w.user_id = $1 AND w.archived = false
        ORDER BY w.created_at DESC
      `;
      
      const result = await db.query(query, [userId]);
      return result.rows;
    } catch (error) {
      console.error("Erro na query de listWallets:", error.message);
      throw new Error("Erro ao processar saldo das carteiras.");
    }
  }

  async updateWallet(userId, walletId, data) {
    const wallet = await walletRepository.findById(walletId);
    
    if (!wallet) throw new Error('Carteira não encontrada.');
    
    // UUIDs são strings, a comparação direta (!==) funciona perfeitamente
    if (wallet.userId !== userId) {
      throw new Error('Acesso negado.');
    }

    return await walletRepository.update(walletId, data);
  }

  async deleteWallet(userId, walletId) {
    const wallet = await walletRepository.findById(walletId);
    
    if (!wallet) throw new Error('Carteira não encontrada.');
    if (wallet.userId !== userId) {
      throw new Error('Acesso negado.');
    }

    await walletRepository.delete(walletId);
  }
}

module.exports = new WalletService();