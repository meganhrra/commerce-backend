const router = require('express').Router();
const ctrl = require('../controllers/categorias.controller');

router.get('/', ctrl.getCategorias);

module.exports = router;
