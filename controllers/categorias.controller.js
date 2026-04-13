const pool = require('../config/db');

async function getCategorias(req, res, next) {
  try {
    const [rows] = await pool.query(
      `SELECT c.id, c.nombre, c.descripcion,
              (SELECT COUNT(*) FROM articulos a WHERE a.categoria_id = c.id AND a.estado = 'activo') AS total_articulos
       FROM categorias c
       WHERE c.estado = TRUE
       ORDER BY c.nombre ASC`
    );

    res.status(200).json({ success: true, data: rows });
  } catch (error) {
    next(error);
  }
}

async function crearCategoria(req, res, next) {
  const { nombre, descripcion } = req.body;

  if (!nombre || !nombre.trim()) {
    return res.status(400).json({ success: false, error: 'El nombre es requerido' });
  }

  try {
    const [result] = await pool.query(
      'INSERT INTO categorias (nombre, descripcion) VALUES (?, ?)',
      [nombre.trim(), descripcion || null]
    );

    const [[categoria]] = await pool.query(
      'SELECT * FROM categorias WHERE id = ?',
      [result.insertId]
    );

    res.status(201).json({ success: true, data: categoria, message: 'Categoría creada' });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ success: false, error: 'Ya existe una categoría con ese nombre' });
    }
    next(error);
  }
}

async function updateCategoria(req, res, next) {
  const { nombre, descripcion, estado } = req.body;
  const { id } = req.params;

  const setClauses = [];
  const values = [];

  if (nombre !== undefined) { setClauses.push('nombre = ?'); values.push(nombre); }
  if (descripcion !== undefined) { setClauses.push('descripcion = ?'); values.push(descripcion); }
  if (estado !== undefined) { setClauses.push('estado = ?'); values.push(estado); }

  if (setClauses.length === 0) {
    return res.status(400).json({ success: false, error: 'No se enviaron campos para actualizar' });
  }

  try {
    let warning;
    if (estado === false || estado === 0 || estado === '0') {
      const [[{ total }]] = await pool.query(
        "SELECT COUNT(*) AS total FROM articulos WHERE categoria_id = ? AND estado = 'activo'",
        [id]
      );
      if (total > 0) {
        warning = `Se afectaron ${total} artículos activos`;
      }
    }

    values.push(id);
    await pool.query(
      `UPDATE categorias SET ${setClauses.join(', ')} WHERE id = ?`,
      values
    );

    const [[categoria]] = await pool.query('SELECT * FROM categorias WHERE id = ?', [id]);

    const response = { success: true, data: categoria };
    if (warning) response.warning = warning;

    res.status(200).json(response);
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ success: false, error: 'Ya existe una categoría con ese nombre' });
    }
    next(error);
  }
}

async function deleteCategoria(req, res, next) {
  const { id } = req.params;
  try {
    const [[{ total }]] = await pool.query(
      "SELECT COUNT(*) AS total FROM articulos WHERE categoria_id = ? AND estado != 'eliminado'",
      [id]
    );

    if (total > 0) {
      return res.status(409).json({
        success: false,
        error: `No se puede eliminar: hay ${total} artículo(s) activos en esta categoría`,
      });
    }

    await pool.query('DELETE FROM categorias WHERE id = ?', [id]);
    res.status(200).json({ success: true, message: 'Categoría eliminada' });
  } catch (error) {
    next(error);
  }
}

module.exports = { getCategorias, crearCategoria, updateCategoria, deleteCategoria };
