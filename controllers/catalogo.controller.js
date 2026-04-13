const pool = require('../config/db');
const { paginate, paginationMeta } = require('../utils/helpers');

/* Shared SELECT block for public catalog */
const ARTICULO_SELECT = `
  a.id AS articulo_id,
  a.titulo,
  a.descripcion,
  a.precio,
  a.precio_anterior,
  a.es_oferta,
  a.ubicacion,
  a.vistas,
  a.created_at AS fecha_publicacion,
  c.id AS categoria_id,
  c.nombre AS categoria,
  COALESCE(u.nombre_publico, CONCAT(u.nombre, ' ', u.apellido)) AS vendedor,
  u.id AS vendedor_id,
  u.telefono AS contacto_telefono,
  u.email AS contacto_email,
  (SELECT img.imagen_url FROM imagenes_articulo img
   WHERE img.articulo_id = a.id AND img.principal = 1 LIMIT 1) AS imagen_principal
FROM articulos a
JOIN usuarios u ON a.usuario_id = u.id
JOIN categorias c ON a.categoria_id = c.id
`;

async function getCatalogo(req, res, next) {
  try {
    const { page, limit, offset } = paginate(req.query.page, req.query.limit);
    const { categoria_id, orden, oferta, precio_min, precio_max, prioridad_usuario_id } = req.query;

    const ORDENES = {
      recientes: 'a.created_at DESC',
      precio_asc: 'a.precio ASC',
      precio_desc: 'a.precio DESC',
    };
    const orderBy = ORDENES[orden] || ORDENES.recientes;
    // Put vendor's own articles first when requested (parseInt guards against injection)
    const parsedPriorityId = parseInt(prioridad_usuario_id, 10);
    const priorityOrder = prioridad_usuario_id && !isNaN(parsedPriorityId)
      ? `CASE WHEN a.usuario_id = ${parsedPriorityId} THEN 0 ELSE 1 END ASC, ${orderBy}`
      : orderBy;

    const conditions = ["a.estado = 'activo'", 'u.estado = TRUE'];
    const params = [];
    const countParams = [];

    if (categoria_id) {
      conditions.push('a.categoria_id = ?');
      params.push(categoria_id);
      countParams.push(categoria_id);
    }
    if (oferta === 'true') {
      conditions.push('a.es_oferta = TRUE');
    }
    if (precio_min) {
      conditions.push('a.precio >= ?');
      params.push(Number(precio_min));
      countParams.push(Number(precio_min));
    }
    if (precio_max) {
      conditions.push('a.precio <= ?');
      params.push(Number(precio_max));
      countParams.push(Number(precio_max));
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    const [rows] = await pool.query(
      `SELECT ${ARTICULO_SELECT} ${whereClause} ORDER BY ${priorityOrder} LIMIT ? OFFSET ?`,
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
      pagination: paginationMeta(page, limit, total),
    });
  } catch (error) {
    next(error);
  }
}

async function getOfertas(req, res, next) {
  try {
    const { page, limit, offset } = paginate(req.query.page, req.query.limit);

    const [rows] = await pool.query(
      `SELECT ${ARTICULO_SELECT}
       WHERE a.estado = 'activo' AND a.es_oferta = TRUE AND u.estado = TRUE
       ORDER BY a.created_at DESC LIMIT ? OFFSET ?`,
      [limit, offset]
    );

    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total FROM articulos a
       JOIN usuarios u ON a.usuario_id = u.id
       WHERE a.estado = 'activo' AND a.es_oferta = TRUE AND u.estado = TRUE`
    );

    res.status(200).json({
      success: true,
      data: rows,
      pagination: paginationMeta(page, limit, total),
    });
  } catch (error) {
    next(error);
  }
}

async function buscar(req, res, next) {
  const { q, categoria_id, precio_min, precio_max, ubicacion, oferta, page, limit: limitParam } = req.query;

  if (!q || !q.trim()) {
    return res.status(400).json({ success: false, error: 'El parámetro de búsqueda es requerido' });
  }

  try {
    const { page: p, limit, offset } = paginate(page, limitParam);

    const conditions = ["a.estado = 'activo'", 'u.estado = TRUE'];
    const params = [];
    const countParams = [];

    /* Use LIKE-based search (no FULLTEXT dependency) */
    const term = `%${q.trim()}%`;
    conditions.push('(a.titulo LIKE ? OR a.descripcion LIKE ?)');
    params.push(term, term);
    countParams.push(term, term);

    if (categoria_id) {
      conditions.push('a.categoria_id = ?');
      params.push(categoria_id);
      countParams.push(categoria_id);
    }
    if (precio_min) {
      conditions.push('a.precio >= ?');
      params.push(Number(precio_min));
      countParams.push(Number(precio_min));
    }
    if (precio_max) {
      conditions.push('a.precio <= ?');
      params.push(Number(precio_max));
      countParams.push(Number(precio_max));
    }
    if (ubicacion) {
      conditions.push('a.ubicacion LIKE ?');
      params.push(`${ubicacion}%`);
      countParams.push(`${ubicacion}%`);
    }
    if (oferta === 'true' || oferta === '1') {
      conditions.push('a.es_oferta = TRUE');
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    const [rows] = await pool.query(
      `SELECT ${ARTICULO_SELECT} ${whereClause} ORDER BY a.created_at DESC LIMIT ? OFFSET ?`,
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
      pagination: paginationMeta(p, limit, total),
    });
  } catch (error) {
    next(error);
  }
}

async function getDetalle(req, res, next) {
  try {
    const [[articulo]] = await pool.query(
      `SELECT
         a.id AS articulo_id,
         a.titulo,
         a.descripcion,
         a.precio,
         a.precio_anterior,
         a.es_oferta,
         a.estado,
         a.ubicacion,
         a.vistas,
         a.created_at AS fecha_publicacion,
         a.usuario_id,
         u.id AS vendedor_id,
         c.id AS categoria_id,
         c.nombre AS categoria,
         COALESCE(u.nombre_publico, CONCAT(u.nombre, ' ', u.apellido)) AS vendedor,
         u.telefono AS contacto_telefono,
         u.email AS contacto_email,
         u.mostrar_direccion,
         u.direccion
       FROM articulos a
       JOIN usuarios u ON a.usuario_id = u.id
       JOIN categorias c ON a.categoria_id = c.id
       WHERE a.id = ? AND a.estado = 'activo' AND u.estado = TRUE`,
      [req.params.id]
    );

    if (!articulo) {
      return res.status(404).json({ success: false, error: 'Artículo no disponible' });
    }

    const [imagenes] = await pool.query(
      'SELECT * FROM imagenes_articulo WHERE articulo_id = ? ORDER BY principal DESC, orden ASC, id ASC',
      [req.params.id]
    );

    res.status(200).json({ success: true, data: { articulo, imagenes } });
  } catch (error) {
    next(error);
  }
}

async function registrarVista(req, res, next) {
  try {
    await pool.query(
      'UPDATE articulos SET vistas = vistas + 1 WHERE id = ? AND estado = ?',
      [req.params.id, 'activo']
    );
    res.status(200).json({ success: true });
  } catch (error) {
    next(error);
  }
}

module.exports = { getCatalogo, getOfertas, buscar, getDetalle, registrarVista };
