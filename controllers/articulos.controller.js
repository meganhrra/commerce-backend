const { validationResult } = require('express-validator');
const pool = require('../config/db');
const { paginate, paginationMeta } = require('../utils/helpers');

const ESTADOS_FINALES = ['vendido', 'eliminado'];
const CAMPOS_CONTENIDO = ['titulo', 'descripcion', 'precio', 'precio_anterior', 'es_oferta'];

const TRANSICIONES_VENDEDOR = {
  activo: ['pausado', 'vendido', 'eliminado'],
  pausado: ['activo', 'eliminado'],
  vendido: ['activo', 'eliminado'],
  moderado: ['en_revision', 'eliminado'],
  en_revision: ['eliminado']
};

async function getMisArticulos(req, res, next) {
  try {
    const { page, limit, offset } = paginate(req.query.page, req.query.limit);
    const { buscar, estado, categoria_id } = req.query;

    const conditions = ["a.usuario_id = ?", "a.estado != 'eliminado'"];
    const params = [req.user.id];
    const countParams = [req.user.id];

    if (buscar && buscar.trim()) {
      const term = `%${buscar.trim()}%`;
      conditions.push('(a.titulo LIKE ? OR a.descripcion LIKE ?)');
      params.push(term, term);
      countParams.push(term, term);
    }

    if (estado && estado.trim()) {
      conditions.push('a.estado = ?');
      params.push(estado.trim());
      countParams.push(estado.trim());
    }

    if (categoria_id) {
      conditions.push('a.categoria_id = ?');
      params.push(Number(categoria_id));
      countParams.push(Number(categoria_id));
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    const [rows] = await pool.query(
      `SELECT
         a.id,
         a.titulo,
         a.descripcion,
         a.precio,
         a.precio_anterior,
         a.es_oferta,
         a.estado,
         a.ubicacion,
         a.vistas,
         a.usuario_id,
         a.categoria_id,
         a.created_at AS fecha_publicacion,
         a.updated_at AS fecha_actualizacion,
         c.nombre AS categoria,
         (SELECT img.imagen_url FROM imagenes_articulo img
          WHERE img.articulo_id = a.id AND img.principal = 1 LIMIT 1) AS imagen_principal
       FROM articulos a
       JOIN categorias c ON a.categoria_id = c.id
       ${whereClause}
       ORDER BY a.updated_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total FROM articulos a
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

async function getMiArticulo(req, res, next) {
  try {
    const [[articulo]] = await pool.query(
      'SELECT * FROM articulos WHERE id = ? AND usuario_id = ?',
      [req.params.id, req.user.id]
    );

    if (!articulo) {
      return res.status(404).json({ success: false, error: 'Artículo no encontrado' });
    }

    const [imagenes] = await pool.query(
      'SELECT * FROM imagenes_articulo WHERE articulo_id = ? ORDER BY orden ASC',
      [req.params.id]
    );

    res.status(200).json({ success: true, data: { articulo, imagenes } });
  } catch (error) {
    next(error);
  }
}

async function crearArticulo(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, error: errors.array()[0].msg });
  }

  const {
    titulo, descripcion, precio, categoria_id, ubicacion,
    contacto_telefono, contacto_email, es_oferta, precio_anterior
  } = req.body;

  if (es_oferta) {
    if (!precio_anterior) {
      return res.status(400).json({ success: false, error: 'El precio anterior es obligatorio cuando es oferta' });
    }
    if (parseFloat(precio_anterior) <= parseFloat(precio)) {
      return res.status(400).json({ success: false, error: 'El precio anterior debe ser mayor que el precio actual' });
    }
  }

  try {
    const [result] = await pool.query(
      `INSERT INTO articulos (usuario_id, categoria_id, titulo, descripcion, precio, precio_anterior, es_oferta, contacto_telefono, contacto_email, ubicacion)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.user.id,
        categoria_id,
        titulo,
        descripcion || null,
        precio,
        es_oferta ? precio_anterior : null,
        es_oferta ? true : false,
        contacto_telefono || null,
        contacto_email || null,
        ubicacion || null
      ]
    );

    const [[articulo]] = await pool.query(
      'SELECT * FROM articulos WHERE id = ?',
      [result.insertId]
    );

    res.status(201).json({ success: true, data: articulo, message: 'Artículo creado' });
  } catch (error) {
    next(error);
  }
}

async function editarArticulo(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, error: errors.array()[0].msg });
  }

  try {
    const [[articulo]] = await pool.query(
      'SELECT id, estado, usuario_id FROM articulos WHERE id = ? AND usuario_id = ?',
      [req.params.id, req.user.id]
    );

    if (!articulo) {
      return res.status(403).json({ success: false, error: 'No tiene permisos' });
    }

    if (ESTADOS_FINALES.includes(articulo.estado)) {
      return res.status(400).json({ success: false, error: 'No se puede editar un artículo en este estado' });
    }

    const camposEditables = [
      'titulo', 'descripcion', 'precio', 'precio_anterior', 'es_oferta',
      'categoria_id', 'ubicacion', 'contacto_telefono', 'contacto_email'
    ];

    const setClauses = [];
    const values = [];

    for (const campo of camposEditables) {
      if (req.body[campo] !== undefined) {
        setClauses.push(`${campo} = ?`);
        values.push(req.body[campo]);
      }
    }

    if (setClauses.length === 0) {
      return res.status(400).json({ success: false, error: 'No se enviaron campos para actualizar' });
    }

    const seModificaContenido = CAMPOS_CONTENIDO.some(c => req.body[c] !== undefined);
    if (articulo.estado === 'activo' && seModificaContenido) {
      setClauses.push('estado = ?');
      values.push('en_revision');
    }

    values.push(req.params.id);

    await pool.query(
      `UPDATE articulos SET ${setClauses.join(', ')} WHERE id = ?`,
      values
    );

    const [[actualizado]] = await pool.query(
      'SELECT * FROM articulos WHERE id = ?',
      [req.params.id]
    );

    res.status(200).json({ success: true, data: actualizado });
  } catch (error) {
    next(error);
  }
}

async function cambiarEstado(req, res, next) {
  const { estado } = req.body;

  if (!estado) {
    return res.status(400).json({ success: false, error: 'El estado es requerido' });
  }

  try {
    const [[articulo]] = await pool.query(
      'SELECT id, estado FROM articulos WHERE id = ? AND usuario_id = ?',
      [req.params.id, req.user.id]
    );

    if (!articulo) {
      return res.status(403).json({ success: false, error: 'No tiene permisos' });
    }

    const permitidos = TRANSICIONES_VENDEDOR[articulo.estado] || [];
    if (!permitidos.includes(estado)) {
      return res.status(400).json({
        success: false,
        error: `No se puede cambiar de '${articulo.estado}' a '${estado}'`
      });
    }

    await pool.query(
      'UPDATE articulos SET estado = ? WHERE id = ? AND usuario_id = ?',
      [estado, req.params.id, req.user.id]
    );

    const [[actualizado]] = await pool.query(
      'SELECT * FROM articulos WHERE id = ?',
      [req.params.id]
    );

    res.status(200).json({ success: true, data: actualizado });
  } catch (error) {
    next(error);
  }
}

module.exports = { getMisArticulos, getMiArticulo, crearArticulo, editarArticulo, cambiarEstado };
