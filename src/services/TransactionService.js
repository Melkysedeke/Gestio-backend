const transactionRepository = require('../repositories/TransactionRepository');
const walletRepository = require('../repositories/WalletRepository');

class TransactionService {

  async createTransaction(data) {
    const { walletId, type, amount } = data;

    // 1. Verifica se a carteira existe
    const wallet = await walletRepository.findById(walletId);
    if (!wallet) throw new Error('Carteira não encontrada.');

    // 2. Cria a transação
    const transaction = await transactionRepository.create(data);

    // 3. REGRA DE NEGÓCIO: Atualiza o saldo da carteira
    // Se for despesa, subtrai. Se for receita, soma.
    let newBalance = Number(wallet.currentBalance);
    
    if (type === 'expense') {
        newBalance -= amount;
    } else {
        newBalance += amount;
    }

    // Atualiza no banco
    await walletRepository.updateBalance(walletId, newBalance);

    return transaction;
  }

  async getExtract(walletId) {
    return await transactionRepository.findAllByWalletId(walletId);
  }
}

module.exports = new TransactionService();