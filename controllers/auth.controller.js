const { validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const pool = require('../config/db');

const PREGUNTAS_SEGURIDAD = [
  '¿Cuál es el nombre de tu primera mascota?',
  '¿En qué ciudad naciste?',
  '¿Cuál es el nombre de soltera de tu madre?',
  '¿Cuál fue el nombre de tu primera escuela?',
  '¿Cuál es tu película favorita?',
  '¿Cuál es el modelo de tu primer auto?',
];

async function registro(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, error: errors.array()[0].msg });
  }

  const {
    nombre, apellido, nombre_publico, email, password,
    telefono, direccion, mostrar_direccion,
    pregunta_seguridad, respuesta_seguridad,
  } = req.body;

  if (!pregunta_seguridad || !PREGUNTAS_SEGURIDAD.includes(pregunta_seguridad)) {
    return res.status(400).json({ success: false, error: 'Pregunta de seguridad inválida' });
  }
  if (!respuesta_seguridad || !respuesta_seguridad.trim()) {
    return res.status(400).json({ success: false, error: 'La respuesta de seguridad es requerida' });
  }

  try {
    const password_hash = await bcrypt.hash(password, 10);
    const respuesta_seguridad_hash = await bcrypt.hash(respuesta_seguridad.trim().toLowerCase(), 10);

    await pool.query(
      `INSERT INTO usuarios
        (nombre, apellido, nombre_publico, email, password_hash, telefono, direccion, mostrar_direccion, rol, pregunta_seguridad, respuesta_seguridad_hash)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'vendedor', ?, ?)`,
      [
        nombre,
        apellido,
        nombre_publico || null,
        email,
        password_hash,
        telefono,
        direccion || null,
        mostrar_direccion !== undefined ? mostrar_direccion : false,
        pregunta_seguridad,
        respuesta_seguridad_hash,
      ]
    );

    res.status(201).json({ success: true, message: 'Cuenta creada exitosamente' });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ success: false, error: 'El correo ya está registrado' });
    }
    next(error);
  }
}

async function login(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, error: errors.array()[0].msg });
  }

  const { email, password } = req.body;

  try {
    const [[usuario]] = await pool.query(
      'SELECT id, nombre, apellido, nombre_publico, email, password_hash, telefono, rol, estado FROM usuarios WHERE email = ?',
      [email]
    );

    if (!usuario) {
      return res.status(401).json({ success: false, error: 'Credenciales inválidas' });
    }

    const passwordValida = await bcrypt.compare(password, usuario.password_hash);
    if (!passwordValida) {
      return res.status(401).json({ success: false, error: 'Credenciales inválidas' });
    }

    if (!usuario.estado) {
      return res.status(403).json({ success: false, error: 'Cuenta suspendida' });
    }

    const token = jwt.sign(
      { id: usuario.id, email: usuario.email, rol: usuario.rol },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    res.status(200).json({
      success: true,
      data: {
        token,
        usuario: {
          id: usuario.id,
          nombre: usuario.nombre,
          apellido: usuario.apellido,
          nombre_publico: usuario.nombre_publico,
          email: usuario.email,
          telefono: usuario.telefono,
          rol: usuario.rol
        }
      }
    });
  } catch (error) {
    next(error);
  }
}

async function recuperarPassword(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, error: errors.array()[0].msg });
  }

  const { email } = req.body;

  try {
    const [[usuario]] = await pool.query(
      'SELECT id, pregunta_seguridad FROM usuarios WHERE email = ?',
      [email]
    );

    // Always return 200 to avoid email enumeration, but only include pregunta when found
    if (!usuario || !usuario.pregunta_seguridad) {
      return res.status(200).json({
        success: true,
        found: false,
        message: 'Si el correo está registrado, podrás responder tu pregunta de seguridad.',
      });
    }

    res.status(200).json({
      success: true,
      found: true,
      pregunta: usuario.pregunta_seguridad,
    });
  } catch (error) {
    next(error);
  }
}

async function verificarSeguridad(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, error: errors.array()[0].msg });
  }

  const { email, respuesta } = req.body;

  try {
    const [[usuario]] = await pool.query(
      'SELECT id, respuesta_seguridad_hash FROM usuarios WHERE email = ?',
      [email]
    );

    if (!usuario || !usuario.respuesta_seguridad_hash) {
      return res.status(400).json({ success: false, error: 'Respuesta incorrecta' });
    }

    const correcta = await bcrypt.compare(respuesta.trim().toLowerCase(), usuario.respuesta_seguridad_hash);
    if (!correcta) {
      return res.status(400).json({ success: false, error: 'Respuesta incorrecta' });
    }

    const token = crypto.randomBytes(32).toString('hex');

    try {
      await pool.query(
        'INSERT INTO tokens_recuperacion (usuario_id, token, expira_en) VALUES (?, ?, NOW() + INTERVAL 1 HOUR)',
        [usuario.id, token]
      );
    } catch (dbError) {
      if (dbError.sqlState === '45000') {
        return res.status(429).json({ success: false, error: dbError.sqlMessage });
      }
      throw dbError;
    }

    res.status(200).json({ success: true, token });
  } catch (error) {
    next(error);
  }
}

async function restablecerPassword(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, error: errors.array()[0].msg });
  }

  const { token, nueva_password } = req.body;

  try {
    const [[tokenRecord]] = await pool.query(
      'SELECT id, usuario_id FROM tokens_recuperacion WHERE token = ? AND usado = FALSE AND expira_en > NOW()',
      [token]
    );

    if (!tokenRecord) {
      return res.status(400).json({ success: false, error: 'Token inválido o expirado' });
    }

    const password_hash = await bcrypt.hash(nueva_password, 10);

    await pool.query(
      'UPDATE usuarios SET password_hash = ? WHERE id = ?',
      [password_hash, tokenRecord.usuario_id]
    );

    await pool.query(
      'UPDATE tokens_recuperacion SET usado = TRUE WHERE id = ?',
      [tokenRecord.id]
    );

    res.status(200).json({ success: true, message: 'Contraseña restablecida exitosamente' });
  } catch (error) {
    next(error);
  }
}

module.exports = { registro, login, recuperarPassword, verificarSeguridad, restablecerPassword };
