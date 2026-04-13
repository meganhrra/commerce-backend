# Commerce API — Catálogo Digital de Preventa

REST API en Node.js/Express para el sistema de preventa. Se conecta a la base de datos MySQL `commerce_db` (ya existente).

## Requisitos

- Node.js 18+
- MySQL 8 con la base de datos `commerce_db` creada y poblada

## Instalación

```bash
cd backend
npm install
```

## Configuración

1. Copiar el archivo de variables de entorno:

```bash
cp .env.example .env
```

2. Editar `.env` con los valores reales:

| Variable | Descripción |
|---|---|
| `DB_HOST` | Host del servidor MySQL (default: `localhost`) |
| `DB_USER` | Usuario MySQL |
| `DB_PASSWORD` | Contraseña MySQL |
| `JWT_SECRET` | Clave secreta para firmar tokens JWT (mínimo 32 caracteres) |
| `JWT_EXPIRES_IN` | Tiempo de expiración del JWT (ej. `24h`, `7d`) |
| `SMTP_HOST` | Host del servidor SMTP para correos |
| `SMTP_PORT` | Puerto SMTP (ej. `587`) |
| `SMTP_USER` | Usuario SMTP |
| `SMTP_PASS` | Contraseña SMTP |
| `SMTP_FROM` | Dirección remitente (ej. `noreply@grupo8tech.com`) |
| `APP_URL` | URL del frontend React (ej. `http://localhost:5173`) |
| `BACKEND_URL` | URL del backend (ej. `http://localhost:3000`) |
| `PORT` | Puerto donde escucha el servidor (default: `3000`) |
| `CORS_ORIGIN` | Origen permitido para CORS (ej. `http://localhost:5173`) |

## Ejecución

```bash
# Desarrollo (con recarga automática)
npm run dev

# Producción
npm start
```

El servidor iniciará en `http://localhost:3000` (o el puerto configurado en `PORT`).

## Crear el primer administrador

El sistema no expone un endpoint público para crear admins. Hacerlo manualmente en dos pasos:

**Paso 1 — Generar el hash de la contraseña:**

```bash
node -e "require('bcryptjs').hash('tu_password_aqui', 10).then(h => console.log(h))"
```

**Paso 2 — Insertar el usuario admin en MySQL:**

```sql
INSERT INTO usuarios (nombre, apellido, email, password_hash, telefono, rol)
VALUES ('Admin', 'Sistema', 'admin@grupo8tech.com', '<hash_generado>', '8091234567', 'admin');
```

## Estructura del proyecto

```
backend/
├── config/db.js              # Pool de conexiones MySQL
├── middleware/
│   ├── auth.js               # Verificación JWT + estado activo
│   ├── role.js               # Control de acceso por rol
│   ├── upload.js             # Configuración multer
│   └── errorHandler.js       # Manejo centralizado de errores
├── routes/                   # Definición de rutas
├── controllers/              # Lógica de negocio
├── utils/
│   ├── mailer.js             # Servicio de correo (nodemailer)
│   └── helpers.js            # Paginación y utilidades
└── uploads/images/           # Imágenes subidas (ignorado en git)
```

## Notas sobre imágenes

Las imágenes se almacenan en `uploads/images/` con rutas relativas en la BD. El frontend construye la URL completa:

```
http://localhost:3000/uploads/images/42_1713456789_a3f2k.jpg
```

## Endpoints disponibles

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| POST | `/api/auth/registro` | — | Registro de vendedor |
| POST | `/api/auth/login` | — | Inicio de sesión |
| POST | `/api/auth/recuperar-password` | — | Solicitar recuperación |
| POST | `/api/auth/restablecer-password` | — | Restablecer con token |
| GET | `/api/perfil` | JWT | Ver perfil propio |
| PUT | `/api/perfil` | JWT | Actualizar perfil |
| PUT | `/api/perfil/password` | JWT | Cambiar contraseña |
| GET | `/api/catalogo` | — | Catálogo público paginado |
| GET | `/api/catalogo/ofertas` | — | Ofertas activas |
| GET | `/api/catalogo/buscar` | — | Búsqueda full-text |
| GET | `/api/catalogo/:id` | — | Detalle de artículo |
| GET | `/api/categorias` | — | Listar categorías activas |
| GET | `/api/notificaciones` | JWT | Notificaciones del usuario |
| GET | `/api/notificaciones/no-leidas/count` | JWT | Conteo de no leídas |
| PUT | `/api/notificaciones/:id/leer` | JWT | Marcar como leída |
| PUT | `/api/notificaciones/leer-todas` | JWT | Marcar todas como leídas |
| GET | `/api/mis-articulos` | Vendedor | Mis artículos |
| GET | `/api/mis-articulos/:id` | Vendedor | Detalle de mi artículo |
| POST | `/api/mis-articulos` | Vendedor | Crear artículo |
| PUT | `/api/mis-articulos/:id` | Vendedor | Editar artículo |
| PUT | `/api/mis-articulos/:id/estado` | Vendedor | Cambiar estado |
| POST | `/api/mis-articulos/:id/imagenes` | Vendedor | Subir imagen |
| PUT | `/api/imagenes/:id/principal` | Vendedor | Cambiar imagen principal |
| DELETE | `/api/imagenes/:id` | Vendedor | Eliminar imagen |
| GET | `/api/admin/estadisticas` | Admin | Dashboard stats |
| GET | `/api/admin/usuarios` | Admin | Gestión de usuarios |
| GET | `/api/admin/usuarios/:id` | Admin | Detalle de usuario |
| PUT | `/api/admin/usuarios/:id/suspender` | Admin | Suspender usuario |
| PUT | `/api/admin/usuarios/:id/reactivar` | Admin | Reactivar usuario |
| GET | `/api/admin/articulos` | Admin | Gestión de artículos |
| GET | `/api/admin/articulos/en-revision` | Admin | Artículos pendientes |
| PUT | `/api/admin/articulos/:id/aprobar` | Admin | Aprobar artículo |
| PUT | `/api/admin/articulos/:id/rechazar` | Admin | Rechazar artículo |
| PUT | `/api/admin/articulos/:id/moderar` | Admin | Moderar artículo activo |
| GET | `/api/admin/historial` | Admin | Historial de moderación |
| GET | `/api/admin/historial-usuarios` | Admin | Historial de suspensiones |
| POST | `/api/admin/categorias` | Admin | Crear categoría |
| PUT | `/api/admin/categorias/:id` | Admin | Editar categoría |
| GET | `/api/admin/categorias/estadisticas` | Admin | Estadísticas por categoría |
