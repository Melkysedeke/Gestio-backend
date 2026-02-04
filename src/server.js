const app = require('./app');
const env = require('./config/env'); // Importa suas configurações

// Usa a porta do .env ou 3000 se falhar
const PORT = env.app.port || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando em: ${env.app.url}`);
});