const jwt = require('jsonwebtoken');
const env = require('../config/env');

module.exports = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: 'Token não fornecido' });
  }

  // O header vem assim: "Bearer eyJhbGciOiJIUzI1..."
  // Dividimos para pegar só a parte do token
  const [, token] = authHeader.split(' ');

  try {
    const decoded = jwt.verify(token, env.auth.secret);

    // Injeta o ID do usuário na requisição para o Controller usar
    req.userId = decoded.id;

    return next();
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido' });
  }
};