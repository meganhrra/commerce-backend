require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');
const errorHandler = require('./middleware/errorHandler');

const app = express();

/* Ensure upload directory exists on startup */
const uploadsDir = path.join(__dirname, 'uploads', 'images');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('Created uploads/images directory');
}

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use(rateLimit({ windowMs: 60 * 1000, max: 100 }));

// Rutas públicas (sin JWT)
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/catalogo', require('./routes/catalogo.routes'));
app.use('/api/categorias', require('./routes/categorias.routes'));

// Rutas autenticadas (JWT, cualquier rol)
app.use('/api/perfil', require('./routes/perfil.routes'));
app.use('/api/notificaciones', require('./routes/notificaciones.routes'));

// Rutas vendedor (JWT + rol vendedor)
app.use('/api/mis-articulos', require('./routes/articulos.routes'));
app.use('/api/imagenes', require('./routes/imagenes.routes'));

// Rutas admin (JWT + rol admin)
app.use('/api/admin', require('./routes/admin.routes'));

app.use(errorHandler);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor corriendo en puerto ${PORT}`));
