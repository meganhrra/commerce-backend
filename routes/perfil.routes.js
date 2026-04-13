const router = require('express').Router();
const { body } = require('express-validator');
const auth = require('../middleware/auth');
const ctrl = require('../controllers/perfil.controller');

router.use(auth);

router.get('/', ctrl.getPerfil);

router.put(
  '/',
  [
    body('email').optional().isEmail().withMessage('Email inválido').normalizeEmail(),
    body('telefono').optional().isLength({ min: 7 }).withMessage('El teléfono debe tener al menos 7 caracteres')
  ],
  ctrl.updatePerfil
);

router.put(
  '/password',
  [
    body('password_actual').notEmpty().withMessage('La contraseña actual es requerida'),
    body('nueva_password').isLength({ min: 8 }).withMessage('La nueva contraseña debe tener al menos 8 caracteres')
  ],
  ctrl.updatePassword
);

module.exports = router;
