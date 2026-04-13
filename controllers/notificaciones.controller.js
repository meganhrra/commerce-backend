const pool = require('../config/db');
const { paginate, paginationMeta } = require('../utils/helpers');

async function getNotificaciones(req, res, next) {
  try {
    const { page, limit, offset } = paginate(req.query.page, req.query.limit || 20);
    const { leida } = req.query;

    const conditions = ['usuario_id = ?'];
    const params = [req.user.id];
    const countParams = [req.user.id];

    if (leida !== undefined) {
      conditions.push('leida = ?');
      const leidaVal = leida === 'true' || leida === '1' ? 1 : 0;
      params.push(leidaVal);
      countParams.push(leidaVal);
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    const [rows] = await pool.query(
      `SELECT * FROM notificaciones ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total FROM notificaciones ${whereClause}`,
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

async function contarNoLeidas(req, res, next) {
  try {
    const [[{ count }]] = await pool.query(
      'SELECT COUNT(*) AS count FROM notificaciones WHERE usuario_id = ? AND leida = FALSE',
      [req.user.id]
    );

    res.status(200).json({ success: true, data: { count } });
  } catch (error) {
    next(error);
  }
}

async function marcarLeida(req, res, next) {
  try {
    const [result] = await pool.query(
      'UPDATE notificaciones SET leida = TRUE WHERE id = ? AND usuario_id = ?',
      [req.params.id, req.user.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, error: 'Notificación no encontrada' });
    }

    res.status(200).json({ success: true, message: 'Notificación marcada como leída' });
  } catch (error) {
    next(error);
  }
}

async function leerTodas(req, res, next) {
  try {
    await pool.query(
      'UPDATE notificaciones SET leida = TRUE WHERE usuario_id = ? AND leida = FALSE',
      [req.user.id]
    );

    res.status(200).json({ success: true, message: 'Todas las notificaciones marcadas como leídas' });
  } catch (error) {
    next(error);
  }
}

module.exports = { getNotificaciones, contarNoLeidas, marcarLeida, leerTodas };
