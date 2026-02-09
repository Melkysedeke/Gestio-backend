const { verify } = require('jsonwebtoken');
const env = require('../config/env');

function AuthMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: 'Token não enviado' });
  }
  const [, token] = authHeader.split(' ');
  try {
    const decoded = verify(token, env.auth.secret);
    const { sub } = decoded;
    req.user = {
      id: Number(sub) 
    };
    return next();
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido' });
  }
}

module.exports = AuthMiddleware;