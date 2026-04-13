const router = require('express').Router();
const { body } = require('express-validator');
const auth = require('../middleware/auth');
const requireRole = require('../middleware/role');
const upload = require('../middleware/upload');
const ctrl = require('../controllers/articulos.controller');
const imagenesCtrl = require('../controllers/imagenes.controller');

router.use(auth, requireRole('vendedor'));

router.get('/', ctrl.getMisArticulos);

router.post(
  '/',
  [
    body('titulo').trim().notEmpty().withMessage('El título es requerido'),
    body('precio').isFloat({ gt: 0 }).withMessage('El precio debe ser mayor a 0'),
    body('categoria_id').isInt({ gt: 0 }).withMessage('La categoría es requerida')
  ],
  ctrl.crearArticulo
);

router.put(
  '/:id',
  [
    body('precio').optional().isFloat({ gt: 0 }).withMessage('El precio debe ser mayor a 0'),
    body('categoria_id').optional().isInt({ gt: 0 }).withMessage('Categoría inválida')
  ],
  ctrl.editarArticulo
);

/* Estado — acepta PUT y PATCH */
router.put('/:id/estado', ctrl.cambiarEstado);
router.patch('/:id/estado', ctrl.cambiarEstado);

/* Imágenes — GET para listar, POST para subir */
router.get('/:id/imagenes', imagenesCtrl.getImagenes);
router.post('/:id/imagenes', upload.single('imagen'), imagenesCtrl.subirImagen);

/* Detalle (al final para no capturar /imagenes) */
router.get('/:id', ctrl.getMiArticulo);

module.exports = router;
