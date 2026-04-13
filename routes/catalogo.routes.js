const router = require('express').Router();
const ctrl = require('../controllers/catalogo.controller');

// Las rutas estáticas DEBEN ir antes que /:id
router.get('/ofertas', ctrl.getOfertas);
router.get('/buscar', ctrl.buscar);
router.post('/:id/vista', ctrl.registrarVista);
router.get('/:id', ctrl.getDetalle);
router.get('/', ctrl.getCatalogo);

module.exports = router;
