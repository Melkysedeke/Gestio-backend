const { verify } = require('jsonwebtoken');
const env = require('../config/env');

function AuthMiddleware(req, res, next) {
  console.log("🛠️ AuthMiddleware: Iniciando verificação...");
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    console.log("⚠️ AuthMiddleware: Header Authorization ausente!");
    return res.status(401).json({ error: 'Token não enviado' });
  }

  const [, token] = authHeader.split(' ');
  
  try {
    const decoded = verify(token, env.auth.secret);
    console.log("🔑 AuthMiddleware: Token decodificado com sucesso. Sub:", decoded.sub);
    
    req.user = { id: String(decoded.sub) };
    
    console.log("✅ AuthMiddleware: Tudo OK, indo para o Controller...");
    return next();
  } catch (err) {
    console.log("❌ AuthMiddleware: Erro na verificação do JWT ->", err.message);
    return res.status(401).json({ error: 'Token inválido' });
  }
}

module.exports = AuthMiddleware;