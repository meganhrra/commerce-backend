const jwt = require('jsonwebtoken');
const pool = require('../config/db');

module.exports = async (req, res, next) => {
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Token requerido' });
  }

  const token = authHeader.split(' ')[1];

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ success: false, error: 'Token inválido o expirado' });
  }

  try {
    const [[usuario]] = await pool.execute(
      'SELECT estado FROM usuarios WHERE id = ?',
      [decoded.id]
    );

    if (!usuario) {
      return res.status(401).json({ success: false, error: 'Token inválido o expirado' });
    }

    if (!usuario.estado) {
      return res.status(403).json({ success: false, error: 'Cuenta suspendida' });
    }

    req.user = { id: decoded.id, email: decoded.email, rol: decoded.rol };
    next();
  } catch (error) {
    next(error);
  }
};
