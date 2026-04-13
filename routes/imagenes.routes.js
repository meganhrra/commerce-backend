const router = require('express').Router();
const auth = require('../middleware/auth');
const ctrl = require('../controllers/imagenes.controller');

router.use(auth);

router.put('/:id/principal', ctrl.cambiarPrincipal);
router.patch('/:id/principal', ctrl.cambiarPrincipal);
router.delete('/:id', ctrl.eliminarImagen);

module.exports = router;
