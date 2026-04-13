const router = require('express').Router();
const { body } = require('express-validator');
const ctrl = require('../controllers/auth.controller');

router.post(
  '/registro',
  [
    body('nombre').trim().notEmpty().withMessage('El nombre es requerido'),
    body('apellido').trim().notEmpty().withMessage('El apellido es requerido'),
    body('email').isEmail().withMessage('Email inválido').normalizeEmail(),
    body('password').isLength({ min: 8 }).withMessage('La contraseña debe tener al menos 8 caracteres'),
    body('telefono').isLength({ min: 7 }).withMessage('El teléfono debe tener al menos 7 caracteres'),
    body('pregunta_seguridad').trim().notEmpty().withMessage('La pregunta de seguridad es requerida'),
    body('respuesta_seguridad').trim().notEmpty().withMessage('La respuesta de seguridad es requerida'),
  ],
  ctrl.registro
);

router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Email inválido').normalizeEmail(),
    body('password').notEmpty().withMessage('La contraseña es requerida')
  ],
  ctrl.login
);

router.post(
  '/recuperar-password',
  [
    body('email').isEmail().withMessage('Email inválido').normalizeEmail()
  ],
  ctrl.recuperarPassword
);

router.post(
  '/verificar-seguridad',
  [
    body('email').isEmail().withMessage('Email inválido').normalizeEmail(),
    body('respuesta').trim().notEmpty().withMessage('La respuesta es requerida'),
  ],
  ctrl.verificarSeguridad
);

router.post(
  '/restablecer-password',
  [
    body('token').notEmpty().withMessage('Token requerido'),
    body('nueva_password').isLength({ min: 8 }).withMessage('La contraseña debe tener al menos 8 caracteres')
  ],
  ctrl.restablecerPassword
);

module.exports = router;
