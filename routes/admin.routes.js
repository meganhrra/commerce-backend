const router = require('express').Router();
const { body } = require('express-validator');
const auth = require('../middleware/auth');
const requireRole = require('../middleware/role');
const ctrl = require('../controllers/admin.controller');
const catCtrl = require('../controllers/categorias.controller');

router.use(auth, requireRole('admin'));

// Dashboard
router.get('/estadisticas', ctrl.getEstadisticas);

// Usuarios
router.get('/usuarios', ctrl.getUsuarios);
router.get('/usuarios/:id', ctrl.getUsuario);
router.get('/usuarios/:id/articulos', ctrl.getArticulosDeUsuario);
router.put('/usuarios/:id/suspender', ctrl.suspenderUsuario);
router.patch('/usuarios/:id/suspender', ctrl.suspenderUsuario);
router.put('/usuarios/:id/reactivar', ctrl.reactivarUsuario);
router.patch('/usuarios/:id/reactivar', ctrl.reactivarUsuario);
router.patch('/usuarios/:id/activar', ctrl.reactivarUsuario);

// Artículos — ruta estática antes que /:id
router.get('/articulos/en-revision', ctrl.getArticulosEnRevision);
router.get('/articulos', ctrl.getArticulos);
router.get('/articulos/:id', ctrl.getArticuloDetalle);
router.put('/articulos/:id/aprobar', ctrl.aprobarArticulo);
router.patch('/articulos/:id/aprobar', ctrl.aprobarArticulo);
router.put(
  '/articulos/:id/rechazar',
  [body('motivo').trim().notEmpty().withMessage('El motivo es obligatorio')],
  ctrl.rechazarArticulo
);
router.patch(
  '/articulos/:id/rechazar',
  [body('motivo').trim().notEmpty().withMessage('El motivo es obligatorio')],
  ctrl.rechazarArticulo
);
router.put(
  '/articulos/:id/moderar',
  [body('motivo').trim().notEmpty().withMessage('El motivo es obligatorio')],
  ctrl.moderarArticulo
);
router.patch(
  '/articulos/:id/moderar',
  [body('motivo').trim().notEmpty().withMessage('El motivo es obligatorio')],
  ctrl.moderarArticulo
);

// Historial
router.get('/historial', ctrl.getHistorialModeracion);
router.get('/historial/moderacion', ctrl.getHistorialModeracion);
router.get('/historial-usuarios', ctrl.getHistorialUsuarios);
router.get('/historial/usuarios', ctrl.getHistorialUsuarios);

// Categorías
router.get('/categorias/estadisticas', ctrl.getEstadisticasCategorias);
router.post(
  '/categorias',
  [body('nombre').trim().notEmpty().withMessage('El nombre es requerido')],
  catCtrl.crearCategoria
);
router.put('/categorias/:id', catCtrl.updateCategoria);
router.delete('/categorias/:id', catCtrl.deleteCategoria);

module.exports = router;
