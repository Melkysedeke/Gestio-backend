const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'gestio',
  password: '123',
  port: 5432,
});

// Teste de conexão simples
pool.on('connect', () => {
  console.log('Base de Dados conectada com sucesso!');
});

module.exports = {
  query: (text, params) => pool.query(text, params),
};