const { validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const pool = require('../config/db');

async function getPerfil(req, res, next) {
  try {
    const [[usuario]] = await pool.query(
      'SELECT id, nombre, apellido, nombre_publico, email, telefono, direccion, mostrar_direccion, rol, created_at FROM usuarios WHERE id = ?',
      [req.user.id]
    );

    if (!usuario) {
      return res.status(404).json({ success: false, error: 'Usuario no encontrado' });
    }

    res.status(200).json({ success: true, data: usuario });
  } catch (error) {
    next(error);
  }
}

async function updatePerfil(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, error: errors.array()[0].msg });
  }

  const campos = ['nombre', 'apellido', 'nombre_publico', 'email', 'telefono', 'direccion', 'mostrar_direccion'];
  const setClauses = [];
  const values = [];

  for (const campo of campos) {
    if (req.body[campo] !== undefined) {
      setClauses.push(`${campo} = ?`);
      values.push(req.body[campo]);
    }
  }

  if (setClauses.length === 0) {
    return res.status(400).json({ success: false, error: 'No se enviaron campos para actualizar' });
  }

  values.push(req.user.id);

  try {
    await pool.query(
      `UPDATE usuarios SET ${setClauses.join(', ')} WHERE id = ?`,
      values
    );

    const [[usuario]] = await pool.query(
      'SELECT id, nombre, apellido, nombre_publico, email, telefono, direccion, mostrar_direccion, rol, created_at FROM usuarios WHERE id = ?',
      [req.user.id]
    );

    res.status(200).json({ success: true, data: usuario });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ success: false, error: 'El correo ya está registrado' });
    }
    next(error);
  }
}

async function updatePassword(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, error: errors.array()[0].msg });
  }

  const { password_actual, nueva_password } = req.body;

  try {
    const [[usuario]] = await pool.query(
      'SELECT password_hash FROM usuarios WHERE id = ?',
      [req.user.id]
    );

    const coincide = await bcrypt.compare(password_actual, usuario.password_hash);
    if (!coincide) {
      return res.status(401).json({ success: false, error: 'Contraseña actual incorrecta' });
    }

    const password_hash = await bcrypt.hash(nueva_password, 10);
    await pool.query(
      'UPDATE usuarios SET password_hash = ? WHERE id = ?',
      [password_hash, req.user.id]
    );

    res.status(200).json({ success: true, message: 'Contraseña actualizada' });
  } catch (error) {
    next(error);
  }
}

module.exports = { getPerfil, updatePerfil, updatePassword };
