const router = require('express').Router();
const auth = require('../middleware/auth');
const ctrl = require('../controllers/notificaciones.controller');

router.use(auth);

// La ruta estática /no-leidas/count debe ir antes que /:id
router.get('/no-leidas/count', ctrl.contarNoLeidas);
router.put('/leer-todas', ctrl.leerTodas);
router.get('/', ctrl.getNotificaciones);
router.put('/:id/leer', ctrl.marcarLeida);

module.exports = router;
