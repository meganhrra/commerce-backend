const { validationResult } = require('express-validator');
const pool = require('../config/db');
const { paginate, paginationMeta } = require('../utils/helpers');

async function getEstadisticas(req, res, next) {
  try {
    const [
      [[{ total_usuarios }]],
      [[{ usuarios_activos }]],
      [[{ usuarios_suspendidos }]],
      [[{ total_articulos }]],
      [[{ articulos_activos }]],
      [[{ articulos_en_revision }]],
      [[{ articulos_moderados }]],
      [[{ articulos_vendidos }]],
      [[{ total_categorias }]],
      [[{ articulos_oferta }]],
    ] = await Promise.all([
      pool.query('SELECT COUNT(*) AS total_usuarios FROM usuarios WHERE rol = "vendedor"'),
      pool.query('SELECT COUNT(*) AS usuarios_activos FROM usuarios WHERE rol = "vendedor" AND estado = TRUE'),
      pool.query('SELECT COUNT(*) AS usuarios_suspendidos FROM usuarios WHERE rol = "vendedor" AND estado = FALSE'),
      pool.query("SELECT COUNT(*) AS total_articulos FROM articulos WHERE estado != 'eliminado'"),
      pool.query("SELECT COUNT(*) AS articulos_activos FROM articulos WHERE estado = 'activo'"),
      pool.query("SELECT COUNT(*) AS articulos_en_revision FROM articulos WHERE estado = 'en_revision'"),
      pool.query("SELECT COUNT(*) AS articulos_moderados FROM articulos WHERE estado = 'moderado'"),
      pool.query("SELECT COUNT(*) AS articulos_vendidos FROM articulos WHERE estado = 'vendido'"),
      pool.query('SELECT COUNT(*) AS total_categorias FROM categorias'),
      pool.query("SELECT COUNT(*) AS articulos_oferta FROM articulos WHERE es_oferta = TRUE AND estado = 'activo'"),
    ]);

    res.status(200).json({
      success: true,
      data: {
        total_usuarios,
        usuarios_activos,
        usuarios_suspendidos,
        total_articulos,
        articulos_activos,
        articulos_en_revision,
        articulos_moderados,
        articulos_vendidos,
        total_categorias,
        articulos_oferta,
      }
    });
  } catch (error) {
    next(error);
  }
}

const USUARIO_SELECT = `
  u.id,
  u.id AS usuario_id,
  u.nombre,
  u.apellido,
  u.email,
  u.rol,
  u.estado AS activo,
  u.nombre_publico,
  u.telefono,
  u.direccion,
  u.mostrar_direccion,
  u.created_at AS fecha_registro,
  (SELECT COUNT(*) FROM articulos a WHERE a.usuario_id = u.id AND a.estado != 'eliminado') AS total_articulos
FROM usuarios u
`;

async function getUsuarios(req, res, next) {
  try {
    const { page, limit, offset } = paginate(req.query.page, req.query.limit || 20);
    const { buscar, activo } = req.query;

    const conditions = ["u.rol != 'admin'"];
    const params = [];
    const countParams = [];

    if (buscar && buscar.trim()) {
      const term = `%${buscar.trim()}%`;
      conditions.push('(u.nombre LIKE ? OR u.apellido LIKE ? OR u.email LIKE ? OR u.nombre_publico LIKE ?)');
      params.push(term, term, term, term);
      countParams.push(term, term, term, term);
    }

    if (activo !== undefined && activo !== '') {
      const val = activo === 'true' || activo === '1' ? 1 : 0;
      conditions.push('u.estado = ?');
      params.push(val);
      countParams.push(val);
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    const [rows] = await pool.query(
      `SELECT ${USUARIO_SELECT} ${whereClause} ORDER BY u.created_at DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total FROM usuarios u ${whereClause}`,
      countParams
    );

    res.status(200).json({
      success: true,
      data: rows,
      pagination: paginationMeta(page, limit, total)
    });
  } catch (error) {
    next(error);
  }
}

async function getUsuario(req, res, next) {
  try {
    const [[usuario]] = await pool.query(
      `SELECT ${USUARIO_SELECT} WHERE u.id = ?`,
      [req.params.id]
    );

    if (!usuario) {
      return res.status(404).json({ success: false, error: 'Usuario no encontrado' });
    }

    res.status(200).json({ success: true, data: usuario });
  } catch (error) {
    next(error);
  }
}

async function getArticulosDeUsuario(req, res, next) {
  try {
    const [articulos] = await pool.query(
      `SELECT a.id, a.titulo, a.precio, a.estado, a.created_at AS fecha_publicacion
       FROM articulos a
       WHERE a.usuario_id = ? AND a.estado != 'eliminado'
       ORDER BY a.created_at DESC`,
      [req.params.id]
    );

    res.status(200).json({ success: true, data: articulos });
  } catch (error) {
    next(error);
  }
}

async function suspenderUsuario(req, res, next) {
  const { motivo } = req.body;

  try {
    const [[usuario]] = await pool.query(
      'SELECT id, rol, nombre FROM usuarios WHERE id = ?',
      [req.params.id]
    );

    if (!usuario) {
      return res.status(404).json({ success: false, error: 'Usuario no encontrado' });
    }

    if (usuario.rol === 'admin') {
      return res.status(400).json({ success: false, error: 'No se puede suspender a un administrador' });
    }

    const [result] = await pool.query(
      'UPDATE usuarios SET estado = FALSE WHERE id = ? AND rol = "vendedor"',
      [req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(400).json({ success: false, error: 'No se puede suspender este usuario' });
    }

    await pool.query(
      'INSERT INTO historial_usuarios (usuario_id, admin_id, accion, motivo) VALUES (?, ?, "suspendido", ?)',
      [req.params.id, req.user.id, motivo || null]
    );

    const mensaje = motivo
      ? `Tu cuenta ha sido suspendida. Motivo: ${motivo}`
      : 'Tu cuenta ha sido suspendida.';

    await pool.query(
      'INSERT INTO notificaciones (usuario_id, tipo, titulo, mensaje) VALUES (?, "cuenta_suspendida", "Cuenta suspendida", ?)',
      [req.params.id, mensaje]
    );

    res.status(200).json({ success: true, message: 'Usuario suspendido' });
  } catch (error) {
    next(error);
  }
}

async function reactivarUsuario(req, res, next) {
  const { motivo } = req.body;

  try {
    const [[usuario]] = await pool.query(
      'SELECT id FROM usuarios WHERE id = ?',
      [req.params.id]
    );

    if (!usuario) {
      return res.status(404).json({ success: false, error: 'Usuario no encontrado' });
    }

    await pool.query(
      'UPDATE usuarios SET estado = TRUE WHERE id = ?',
      [req.params.id]
    );

    await pool.query(
      'INSERT INTO historial_usuarios (usuario_id, admin_id, accion, motivo) VALUES (?, ?, "reactivado", ?)',
      [req.params.id, req.user.id, motivo || null]
    );

    const mensaje = motivo
      ? `Tu cuenta ha sido reactivada. ${motivo}`
      : 'Tu cuenta ha sido reactivada y puedes acceder nuevamente.';

    await pool.query(
      'INSERT INTO notificaciones (usuario_id, tipo, titulo, mensaje) VALUES (?, "cuenta_reactivada", "Cuenta reactivada", ?)',
      [req.params.id, mensaje]
    );

    res.status(200).json({ success: true, message: 'Usuario reactivado' });
  } catch (error) {
    next(error);
  }
}

async function getArticulos(req, res, next) {
  try {
    const { page, limit, offset } = paginate(req.query.page, req.query.limit || 20);
    const { buscar, estado } = req.query;

    const conditions = ["a.estado != 'eliminado'"];
    const params = [];
    const countParams = [];

    if (buscar && buscar.trim()) {
      const term = `%${buscar.trim()}%`;
      conditions.push('(a.titulo LIKE ? OR u.nombre_publico LIKE ? OR CONCAT(u.nombre, \' \', u.apellido) LIKE ?)');
      params.push(term, term, term);
      countParams.push(term, term, term);
    }

    if (estado) {
      conditions.push('a.estado = ?');
      params.push(estado);
      countParams.push(estado);
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    const [rows] = await pool.query(
      `SELECT a.id, a.titulo, a.precio, a.es_oferta, a.estado, a.vistas, a.created_at,
              c.nombre AS categoria,
              COALESCE(u.nombre_publico, CONCAT(u.nombre, ' ', u.apellido)) AS vendedor,
              (SELECT img.imagen_url FROM imagenes_articulo img
               WHERE img.articulo_id = a.id AND img.principal = 1 LIMIT 1) AS imagen_principal
       FROM articulos a
       JOIN usuarios u ON a.usuario_id = u.id
       JOIN categorias c ON a.categoria_id = c.id
       ${whereClause}
       ORDER BY a.created_at DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total FROM articulos a
       JOIN usuarios u ON a.usuario_id = u.id
       JOIN categorias c ON a.categoria_id = c.id
       ${whereClause}`,
      countParams
    );

    res.status(200).json({
      success: true,
      data: rows,
      pagination: paginationMeta(page, limit, total)
    });
  } catch (error) {
    next(error);
  }
}

async function getArticulosEnRevision(req, res, next) {
  try {
    const { page, limit, offset } = paginate(req.query.page, req.query.limit || 50);

    const [rows] = await pool.query(
      `SELECT
         a.id,
         a.titulo,
         a.descripcion,
         a.precio,
         a.precio_anterior,
         a.es_oferta,
         a.ubicacion,
         a.estado,
         a.created_at AS fecha_publicacion,
         c.nombre AS categoria,
         COALESCE(u.nombre_publico, CONCAT(u.nombre, ' ', u.apellido)) AS vendedor,
         u.id AS vendedor_id,
         (SELECT img.imagen_url FROM imagenes_articulo img
          WHERE img.articulo_id = a.id AND img.principal = 1 LIMIT 1) AS imagen_principal
       FROM articulos a
       JOIN usuarios u ON a.usuario_id = u.id
       JOIN categorias c ON a.categoria_id = c.id
       WHERE a.estado = 'en_revision'
       ORDER BY a.created_at ASC
       LIMIT ? OFFSET ?`,
      [limit, offset]
    );

    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total FROM articulos WHERE estado = 'en_revision'`
    );

    res.status(200).json({
      success: true,
      data: rows,
      pagination: paginationMeta(page, limit, total)
    });
  } catch (error) {
    next(error);
  }
}

async function aprobarArticulo(req, res, next) {
  try {
    const [[articulo]] = await pool.query(
      'SELECT id, usuario_id, titulo, estado FROM articulos WHERE id = ?',
      [req.params.id]
    );

    if (!articulo) {
      return res.status(404).json({ success: false, error: 'Artículo no encontrado' });
    }

    if (articulo.estado !== 'en_revision') {
      return res.status(400).json({ success: false, error: 'Solo se pueden aprobar artículos en revisión' });
    }

    await pool.query(
      "UPDATE articulos SET estado = 'activo' WHERE id = ? AND estado = 'en_revision'",
      [req.params.id]
    );

    await pool.query(
      'INSERT INTO historial_moderacion (articulo_id, admin_id, accion) VALUES (?, ?, "aprobado")',
      [req.params.id, req.user.id]
    );

    await pool.query(
      `INSERT INTO notificaciones (usuario_id, tipo, titulo, mensaje, referencia_id)
       VALUES (?, "articulo_aprobado", "Artículo aprobado", ?, ?)`,
      [
        articulo.usuario_id,
        `Tu artículo "${articulo.titulo}" ha sido aprobado y ya es visible en el catálogo`,
        articulo.id
      ]
    );

    res.status(200).json({ success: true, message: 'Artículo aprobado' });
  } catch (error) {
    next(error);
  }
}

async function rechazarArticulo(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, error: errors.array()[0].msg });
  }

  const { motivo } = req.body;

  try {
    const [[articulo]] = await pool.query(
      'SELECT id, usuario_id, titulo, estado FROM articulos WHERE id = ?',
      [req.params.id]
    );

    if (!articulo) {
      return res.status(404).json({ success: false, error: 'Artículo no encontrado' });
    }

    if (articulo.estado !== 'en_revision') {
      return res.status(400).json({ success: false, error: 'Solo se pueden rechazar artículos en revisión' });
    }

    await pool.query(
      "UPDATE articulos SET estado = 'moderado', motivo_moderacion = ? WHERE id = ? AND estado = 'en_revision'",
      [motivo, req.params.id]
    );

    await pool.query(
      'INSERT INTO historial_moderacion (articulo_id, admin_id, accion, motivo) VALUES (?, ?, "rechazado", ?)',
      [req.params.id, req.user.id, motivo]
    );

    await pool.query(
      `INSERT INTO notificaciones (usuario_id, tipo, titulo, mensaje, referencia_id)
       VALUES (?, "articulo_rechazado", "Artículo rechazado", CONCAT('Tu artículo "', ?, '" fue rechazado: ', ?), ?)`,
      [articulo.usuario_id, articulo.titulo, motivo, articulo.id]
    );

    res.status(200).json({ success: true, message: 'Artículo rechazado' });
  } catch (error) {
    next(error);
  }
}

async function moderarArticulo(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, error: errors.array()[0].msg });
  }

  const { motivo } = req.body;

  try {
    const [[articulo]] = await pool.query(
      'SELECT id, usuario_id, titulo, estado FROM articulos WHERE id = ?',
      [req.params.id]
    );

    if (!articulo) {
      return res.status(404).json({ success: false, error: 'Artículo no encontrado' });
    }

    if (articulo.estado !== 'activo' && articulo.estado !== 'en_revision') {
      return res.status(400).json({ success: false, error: 'Solo se pueden moderar artículos activos o en revisión' });
    }

    await pool.query(
      "UPDATE articulos SET estado = 'moderado', motivo_moderacion = ? WHERE id = ?",
      [motivo, req.params.id]
    );

    await pool.query(
      'INSERT INTO historial_moderacion (articulo_id, admin_id, accion, motivo) VALUES (?, ?, "moderado", ?)',
      [req.params.id, req.user.id, motivo]
    );

    await pool.query(
      `INSERT INTO notificaciones (usuario_id, tipo, titulo, mensaje, referencia_id)
       VALUES (?, "articulo_moderado", "Artículo retirado", CONCAT('Tu artículo "', ?, '" fue retirado del catálogo: ', ?), ?)`,
      [articulo.usuario_id, articulo.titulo, motivo, articulo.id]
    );

    res.status(200).json({ success: true, message: 'Artículo moderado' });
  } catch (error) {
    next(error);
  }
}

async function getHistorialModeracion(req, res, next) {
  try {
    const { page, limit, offset } = paginate(req.query.page, req.query.limit || 20);
    const { accion, vendedor, buscar } = req.query;

    const conditions = [];
    const params = [];
    const countParams = [];

    if (accion && accion.trim()) {
      conditions.push('hm.accion = ?');
      params.push(accion.trim());
      countParams.push(accion.trim());
    }

    const buscarTerm = buscar?.trim() || vendedor?.trim();
    if (buscarTerm) {
      const term = `%${buscarTerm}%`;
      conditions.push('(a.titulo LIKE ? OR uv.nombre LIKE ? OR uv.apellido LIKE ? OR uv.nombre_publico LIKE ?)');
      params.push(term, term, term, term);
      countParams.push(term, term, term, term);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const [rows] = await pool.query(
      `SELECT
         hm.id,
         hm.accion,
         hm.motivo,
         hm.created_at AS fecha,
         a.id AS articulo_id,
         a.titulo,
         COALESCE(uv.nombre_publico, CONCAT(uv.nombre, ' ', uv.apellido)) AS vendedor,
         CONCAT(ua.nombre, ' ', ua.apellido) AS admin,
         (SELECT img.imagen_url FROM imagenes_articulo img
          WHERE img.articulo_id = a.id AND img.principal = 1 LIMIT 1) AS imagen_principal
       FROM historial_moderacion hm
       JOIN articulos a ON hm.articulo_id = a.id
       JOIN usuarios uv ON a.usuario_id = uv.id
       JOIN usuarios ua ON hm.admin_id = ua.id
       ${whereClause}
       ORDER BY hm.created_at DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total
       FROM historial_moderacion hm
       JOIN articulos a ON hm.articulo_id = a.id
       JOIN usuarios uv ON a.usuario_id = uv.id
       JOIN usuarios ua ON hm.admin_id = ua.id
       ${whereClause}`,
      countParams
    );

    res.status(200).json({
      success: true,
      data: rows,
      pagination: paginationMeta(page, limit, total)
    });
  } catch (error) {
    next(error);
  }
}

async function getHistorialUsuarios(req, res, next) {
  try {
    const { page, limit, offset } = paginate(req.query.page, req.query.limit || 20);

    const [rows] = await pool.query(
      `SELECT
         hu.id,
         hu.accion,
         hu.motivo,
         hu.created_at AS fecha_accion,
         hu.usuario_id,
         u.nombre,
         u.apellido,
         u.email,
         CONCAT(ua.nombre, ' ', ua.apellido) AS admin_nombre
       FROM historial_usuarios hu
       JOIN usuarios u ON hu.usuario_id = u.id
       JOIN usuarios ua ON hu.admin_id = ua.id
       ORDER BY hu.created_at DESC LIMIT ? OFFSET ?`,
      [limit, offset]
    );

    const [[{ total }]] = await pool.query(
      'SELECT COUNT(*) AS total FROM historial_usuarios'
    );

    res.status(200).json({
      success: true,
      data: rows,
      pagination: paginationMeta(page, limit, total)
    });
  } catch (error) {
    next(error);
  }
}

async function getArticuloDetalle(req, res, next) {
  try {
    const [[articulo]] = await pool.query(
      `SELECT a.id, a.titulo, a.descripcion, a.precio, a.precio_anterior, a.es_oferta,
              a.estado, a.vistas, a.ubicacion, a.motivo_moderacion, a.created_at AS fecha_publicacion,
              c.nombre AS categoria, c.id AS categoria_id,
              COALESCE(u.nombre_publico, CONCAT(u.nombre, ' ', u.apellido)) AS vendedor,
              u.id AS vendedor_id
       FROM articulos a
       JOIN usuarios u ON a.usuario_id = u.id
       JOIN categorias c ON a.categoria_id = c.id
       WHERE a.id = ?`,
      [req.params.id]
    );

    if (!articulo) {
      return res.status(404).json({ success: false, error: 'Artículo no encontrado' });
    }

    const [imagenes] = await pool.query(
      'SELECT * FROM imagenes_articulo WHERE articulo_id = ? ORDER BY principal DESC, id ASC',
      [req.params.id]
    );

    res.status(200).json({ success: true, data: { articulo, imagenes } });
  } catch (error) {
    next(error);
  }
}

async function getEstadisticasCategorias(req, res, next) {
  try {
    const [rows] = await pool.query('SELECT * FROM v_estadisticas_categorias');
    res.status(200).json({ success: true, data: rows });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getEstadisticas,
  getUsuarios,
  getUsuario,
  getArticulosDeUsuario,
  suspenderUsuario,
  reactivarUsuario,
  getArticulos,
  getArticuloDetalle,
  getArticulosEnRevision,
  aprobarArticulo,
  rechazarArticulo,
  moderarArticulo,
  getHistorialModeracion,
  getHistorialUsuarios,
  getEstadisticasCategorias
};
