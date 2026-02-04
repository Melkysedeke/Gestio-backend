const path = require('path');
const dotenv = require('dotenv');

// Caminho absoluto: Sobe duas pastas a partir de /src/config para chegar na raiz
const envPath = path.resolve(__dirname, '..', '..', '.env');

const result = dotenv.config({ path: envPath });

// Diagnóstico: Se der erro, avisa no console
if (result.error) {
  console.log('⚠️ AVISO: Não foi possível ler o arquivo .env em:', envPath);
}

module.exports = {
  app: {
    port: process.env.PORT || 3000,
    // Se não achar o .env, usa o localhost como fallback
    url: process.env.APP_URL || 'http://localhost:3000',
    env: process.env.NODE_ENV || 'development',
  },
  db: {
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD, // Obrigatório
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'gestio',
    port: Number(process.env.DB_PORT) || 5432,
  },
  auth: {
    secret: process.env.JWT_SECRET || 'fallback_secret',
    expiresIn: '30d',
  },
};