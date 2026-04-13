const fs = require('fs');
const path = require('path');
const pool = require('../config/db');

const MAX_IMAGENES = 5;

async function getImagenes(req, res, next) {
  try {
    const articuloId = parseInt(req.params.id);

    const [[articulo]] = await pool.query(
      'SELECT id FROM articulos WHERE id = ? AND usuario_id = ?',
      [articuloId, req.user.id]
    );

    if (!articulo) {
      return res.status(403).json({ success: false, error: 'No tiene permisos' });
    }

    const [imagenes] = await pool.query(
      'SELECT * FROM imagenes_articulo WHERE articulo_id = ? ORDER BY principal DESC, orden ASC, id ASC',
      [articuloId]
    );

    res.status(200).json({ success: true, data: imagenes });
  } catch (error) {
    next(error);
  }
}

async function subirImagen(req, res, next) {
  if (!req.file) {
    return res.status(400).json({ success: false, error: 'No se recibió ningún archivo' });
  }

  const articuloId = parseInt(req.params.id);

  try {
    const [[articulo]] = await pool.query(
      'SELECT id, usuario_id FROM articulos WHERE id = ? AND usuario_id = ?',
      [articuloId, req.user.id]
    );

    if (!articulo) {
      fs.unlink(req.file.path, () => {});
      return res.status(403).json({ success: false, error: 'No tiene permisos' });
    }

    const [[{ total }]] = await pool.query(
      'SELECT COUNT(*) AS total FROM imagenes_articulo WHERE articulo_id = ?',
      [articuloId]
    );

    if (total >= MAX_IMAGENES) {
      fs.unlink(req.file.path, () => {});
      return res.status(400).json({
        success: false,
        error: `Máximo ${MAX_IMAGENES} imágenes por artículo`
      });
    }

    const esPrimera = total === 0;
    const orden = total;
    const imagenUrl = `uploads/images/${req.file.filename}`;

    const [result] = await pool.query(
      `INSERT INTO imagenes_articulo (articulo_id, imagen_url, principal, orden)
       VALUES (?, ?, ?, ?)`,
      [articuloId, imagenUrl, esPrimera, orden]
    );

    const [[imagen]] = await pool.query(
      'SELECT * FROM imagenes_articulo WHERE id = ?',
      [result.insertId]
    );

    res.status(201).json({ success: true, data: imagen, message: 'Imagen subida correctamente' });
  } catch (error) {
    if (req.file) fs.unlink(req.file.path, () => {});
    next(error);
  }
}

async function cambiarPrincipal(req, res, next) {
  try {
    const [[imagen]] = await pool.query(
      `SELECT i.id, i.articulo_id, a.usuario_id
       FROM imagenes_articulo i
       JOIN articulos a ON i.articulo_id = a.id
       WHERE i.id = ?`,
      [req.params.id]
    );

    if (!imagen) {
      return res.status(404).json({ success: false, error: 'Imagen no encontrada' });
    }

    if (imagen.usuario_id !== req.user.id) {
      return res.status(403).json({ success: false, error: 'No tiene permisos' });
    }

    /* Unset current principal, then set the new one */
    await pool.query(
      'UPDATE imagenes_articulo SET principal = FALSE WHERE articulo_id = ?',
      [imagen.articulo_id]
    );
    await pool.query(
      'UPDATE imagenes_articulo SET principal = TRUE WHERE id = ?',
      [req.params.id]
    );

    res.status(200).json({ success: true, message: 'Imagen principal actualizada' });
  } catch (error) {
    next(error);
  }
}

async function eliminarImagen(req, res, next) {
  try {
    const [[imagen]] = await pool.query(
      `SELECT i.id, i.imagen_url, i.principal, i.articulo_id, a.usuario_id
       FROM imagenes_articulo i
       JOIN articulos a ON i.articulo_id = a.id
       WHERE i.id = ?`,
      [req.params.id]
    );

    if (!imagen) {
      return res.status(404).json({ success: false, error: 'Imagen no encontrada' });
    }

    if (imagen.usuario_id !== req.user.id) {
      return res.status(403).json({ success: false, error: 'No tiene permisos' });
    }

    /* Delete the record */
    await pool.query('DELETE FROM imagenes_articulo WHERE id = ?', [req.params.id]);

    /* If it was the principal, promote the next one */
    if (imagen.principal) {
      const [[next]] = await pool.query(
        'SELECT id FROM imagenes_articulo WHERE articulo_id = ? ORDER BY orden ASC, id ASC LIMIT 1',
        [imagen.articulo_id]
      );
      if (next) {
        await pool.query(
          'UPDATE imagenes_articulo SET principal = TRUE WHERE id = ?',
          [next.id]
        );
      }
    }

    /* Delete the physical file */
    const filePath = path.join(__dirname, '..', imagen.imagen_url);
    fs.unlink(filePath, () => {});

    res.status(200).json({ success: true, message: 'Imagen eliminada' });
  } catch (error) {
    next(error);
  }
}

module.exports = { getImagenes, subirImagen, cambiarPrincipal, eliminarImagen };
