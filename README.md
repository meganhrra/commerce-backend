# Commerce API — Catálogo Digital de Preventa

REST API en **Node.js/Express** para el sistema de catálogo digital de preventa. Gestiona autenticación JWT, catálogo público, artículos de vendedores, imágenes, notificaciones y panel de administración.

---

## Tabla de contenidos

- [Descripción general](#descripción-general)
- [Stack tecnológico](#stack-tecnológico)
- [Requisitos previos](#requisitos-previos)
- [Configuración local paso a paso](#configuración-local-paso-a-paso)
  - [1. Clonar el repositorio](#1-clonar-el-repositorio)
  - [2. Instalar dependencias](#2-instalar-dependencias)
  - [3. Crear y configurar el archivo `.env`](#3-crear-y-configurar-el-archivo-env)
  - [4. Preparar la base de datos MySQL](#4-preparar-la-base-de-datos-mysql)
  - [5. Crear el primer administrador](#5-crear-el-primer-administrador)
  - [6. Iniciar el servidor](#6-iniciar-el-servidor)
- [Variables de entorno](#variables-de-entorno)
- [Frontend requerido](#frontend-requerido)
- [Estructura del proyecto](#estructura-del-proyecto)
- [Autenticación y roles](#autenticación-y-roles)
- [Flujo de recuperación de contraseña](#flujo-de-recuperación-de-contraseña)
- [Manejo de imágenes](#manejo-de-imágenes)
- [Rate limiting](#rate-limiting)
- [Endpoints disponibles](#endpoints-disponibles)
- [Licencia](#licencia)

---

## Descripción general

Este backend expone una API RESTful bajo el prefijo `/api`. El sistema tiene tres tipos de actores:

- **Público** — puede explorar el catálogo de artículos y categorías sin autenticación.
- **Vendedor** (`vendedor`) — puede registrarse, gestionar sus propios artículos e imágenes, y recibir notificaciones.
- **Administrador** (`admin`) — gestiona usuarios, modera artículos, administra categorías y accede a estadísticas.

---

## Stack tecnológico

| Capa | Tecnología |
|------|-----------|
| Runtime | Node.js ≥ 18 |
| Framework | Express 4 |
| Base de datos | MySQL 8 |
| ORM / Driver | mysql2 (pool de conexiones) |
| Autenticación | JWT (`jsonwebtoken`) |
| Hashing | bcryptjs |
| Subida de archivos | Multer (imágenes JPG/PNG/WEBP, máx. 2 MB) |
| Correo electrónico | Nodemailer |
| Seguridad HTTP | Helmet + CORS + express-rate-limit |
| Validación | express-validator |

---

## Requisitos previos

Antes de ejecutar el proyecto asegúrate de tener instalado y disponible lo siguiente:

| Herramienta | Versión mínima | Notas |
|------------|---------------|-------|
| **Node.js** | 18.x | `node --version` para verificar |
| **npm** | 8.x (incluido con Node 18) | — |
| **MySQL** | 8.x | Debe estar en ejecución localmente o en un servidor accesible |
| **Frontend** | — | Ver sección [Frontend requerido](#frontend-requerido) |

> **Opcional:** `nodemon` se instala como dependencia de desarrollo; no es necesario instalarlo globalmente.

---

## Configuración local paso a paso

### 1. Clonar el repositorio

```bash
git clone <url-del-repositorio>
cd commerce_api/backend
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Crear y configurar el archivo `.env`

```bash
cp .env.example .env
```

Edita `.env` con los valores reales. Consulta la sección [Variables de entorno](#variables-de-entorno) para una descripción detallada de cada variable.

Ejemplo mínimo para desarrollo local:

```dotenv
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=tu_password_mysql
JWT_SECRET=una_clave_secreta_de_al_menos_32_caracteres
JWT_EXPIRES_IN=24h
PORT=3000
CORS_ORIGIN=http://localhost:5173
APP_URL=http://localhost:5173
BACKEND_URL=http://localhost:3000
```

> Las variables SMTP son opcionales para desarrollo local si no necesitas enviar correos.

### 4. Preparar la base de datos MySQL

El backend **no incluye migraciones automáticas**. La base de datos `commerce_db` debe existir con el esquema y datos previos cargados.

1. Accede a tu instancia MySQL:

   ```bash
   mysql -u root -p
   ```

2. Crea la base de datos si no existe:

   ```sql
   CREATE DATABASE IF NOT EXISTS commerce_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```

3. Importa el esquema (si tienes un archivo SQL del proyecto):

   ```bash
   mysql -u root -p commerce_db < schema.sql
   ```

> El nombre de la base de datos `commerce_db` está fijo en `config/db.js`; no es configurable por variable de entorno.

### 5. Crear el primer administrador

El sistema no expone endpoint público para crear admins. Hazlo manualmente:

**Paso 1 — Generar el hash de la contraseña:**

```bash
node -e "require('bcryptjs').hash('tu_password_seguro', 10).then(h => console.log(h))"
```

**Paso 2 — Insertar el usuario admin en MySQL:**

```sql
INSERT INTO usuarios (nombre, apellido, email, password_hash, telefono, rol)
VALUES ('Admin', 'Sistema', 'admin@example.com', '<hash_generado_en_paso_1>', '8091234567', 'admin');
```

### 6. Iniciar el servidor

```bash
# Desarrollo con recarga automática (recomendado)
npm run dev

# Producción
npm start
```

El servidor estará disponible en `http://localhost:3000` (o el puerto que hayas definido en `PORT`).

Deberías ver en consola:

```
Servidor corriendo en puerto 3000
```

---

## Variables de entorno

Todas las variables se definen en el archivo `.env` en la raíz del proyecto backend.

| Variable | Obligatoria | Default | Descripción |
|----------|:-----------:|---------|-------------|
| `DB_HOST` | Sí | `localhost` | Host del servidor MySQL |
| `DB_PORT` | No | `3306` | Puerto MySQL |
| `DB_USER` | Sí | — | Usuario MySQL |
| `DB_PASSWORD` | Sí | — | Contraseña MySQL |
| `JWT_SECRET` | Sí | — | Clave secreta para firmar tokens JWT (mínimo 32 caracteres recomendados) |
| `JWT_EXPIRES_IN` | No | `24h` | Duración del token JWT (ej. `24h`, `7d`) |
| `SMTP_HOST` | No* | — | Host del servidor SMTP |
| `SMTP_PORT` | No* | `587` | Puerto SMTP (`465` activa TLS, otros usan STARTTLS) |
| `SMTP_USER` | No* | — | Usuario de la cuenta SMTP |
| `SMTP_PASS` | No* | — | Contraseña de la cuenta SMTP |
| `SMTP_FROM` | No* | `noreply@grupo8tech.com` | Dirección remitente de correos |
| `APP_URL` | No | `http://localhost:5173` | URL del frontend React (usada en links de correos) |
| `BACKEND_URL` | No | `http://localhost:3000` | URL pública del backend |
| `PORT` | No | `3000` | Puerto en que escucha el servidor Express |
| `CORS_ORIGIN` | No | `http://localhost:5173` | Origen permitido por la política CORS |

> \* Las variables SMTP son opcionales en desarrollo local. El envío de correos no está activo en el flujo de recuperación de contraseña en la versión actual; la recuperación usa preguntas de seguridad.

---

## Frontend requerido

Este backend está diseñado para funcionar en conjunto con un **frontend React** (Vite), que por defecto corre en el puerto **5173**.

- El backend permite peticiones desde `http://localhost:5173` mediante CORS. Si el frontend corre en otro puerto o dominio, actualiza `CORS_ORIGIN` en `.env`.
- Las URLs de imágenes que devuelve la API tienen la forma `http://localhost:3000/uploads/images/<nombre_archivo>`. El frontend debe construir la URL completa usando la base del backend.
- Si el frontend no está corriendo, los endpoints de la API seguirán funcionando (puedes probarlos con curl o Postman), pero la experiencia de usuario completa requiere ambos servicios activos.

**Resumen de puertos en desarrollo local:**

| Servicio | Puerto por defecto |
|---------|-------------------|
| Backend (este proyecto) | `3000` |
| Frontend React/Vite | `5173` |
| MySQL | `3306` |

---

## Estructura del proyecto

```
backend/
├── server.js                  # Punto de entrada: Express, middleware global, rutas
├── package.json
├── .env.example               # Plantilla de variables de entorno
├── config/
│   └── db.js                  # Pool de conexiones MySQL (mysql2)
├── middleware/
│   ├── auth.js                # Verificación JWT y comprobación de estado activo
│   ├── role.js                # Control de acceso por rol (admin, vendedor)
│   ├── upload.js              # Configuración Multer (imágenes, 2 MB, JPG/PNG/WEBP)
│   └── errorHandler.js        # Manejador centralizado de errores
├── routes/                    # Definición de rutas Express
│   ├── auth.routes.js
│   ├── catalogo.routes.js
│   ├── categorias.routes.js
│   ├── perfil.routes.js
│   ├── notificaciones.routes.js
│   ├── articulos.routes.js
│   ├── imagenes.routes.js
│   └── admin.routes.js
├── controllers/               # Lógica de negocio por dominio
│   ├── auth.controller.js
│   ├── catalogo.controller.js
│   ├── categorias.controller.js
│   ├── perfil.controller.js
│   ├── notificaciones.controller.js
│   ├── articulos.controller.js
│   ├── imagenes.controller.js
│   └── admin.controller.js
├── utils/
│   ├── helpers.js             # Paginación y utilidades generales
│   └── mailer.js              # Wrapper Nodemailer (configurado, pendiente de integración)
└── uploads/
    └── images/                # Imágenes subidas (excluido de git, solo .gitkeep)
```

---

## Autenticación y roles

La API usa **JWT Bearer tokens**. Para acceder a endpoints protegidos incluye el header:

```
Authorization: Bearer <tu_token_jwt>
```

El token se obtiene al hacer login en `POST /api/auth/login`.

**Roles disponibles:**

| Rol | Acceso |
|-----|--------|
| *(sin autenticar)* | Catálogo público, categorías |
| `vendedor` | Perfil, mis artículos, imágenes, notificaciones |
| `admin` | Todo lo anterior + panel de administración |

Un usuario con estado `suspendido` en la base de datos recibe un error `401` aunque su token sea válido.

---

## Flujo de recuperación de contraseña

La recuperación **no usa correo electrónico** en la versión actual; funciona mediante pregunta de seguridad:

1. `POST /api/auth/recuperar-password` — envía el email; la API devuelve la pregunta de seguridad del usuario.
2. `POST /api/auth/verificar-seguridad` — envía la respuesta a la pregunta; la API devuelve un token de un solo uso.
3. `POST /api/auth/restablecer-password` — envía el token de un solo uso y la nueva contraseña para completar el restablecimiento.

---

## Manejo de imágenes

- Las imágenes se almacenan en `uploads/images/` con un nombre generado automáticamente.
- La base de datos guarda únicamente la ruta relativa (ej. `42_1713456789_a3f2k.jpg`).
- Los archivos son servidos como estáticos en `/uploads/images/<nombre_archivo>`.
- **Límites:** tamaño máximo 2 MB; formatos aceptados: JPG, JPEG, PNG, WEBP.
- El directorio `uploads/images/` está excluido del repositorio git (solo se incluye `.gitkeep`). Asegúrate de que el directorio exista antes de subir imágenes; `npm install` no lo crea automáticamente si no existe el `.gitkeep`.

---

## Rate limiting

El servidor aplica un límite global de **100 solicitudes por IP cada 60 segundos**. Al superar el límite se devuelve `429 Too Many Requests`.

---

## Endpoints disponibles

### Autenticación (`/api/auth`)

| Método | Ruta | Auth | Descripción |
|--------|------|:----:|-------------|
| POST | `/api/auth/registro` | — | Registro de nuevo vendedor |
| POST | `/api/auth/login` | — | Inicio de sesión; devuelve JWT |
| POST | `/api/auth/recuperar-password` | — | Paso 1: solicitar recuperación (devuelve pregunta de seguridad) |
| POST | `/api/auth/verificar-seguridad` | — | Paso 2: responder pregunta (devuelve token de un solo uso) |
| POST | `/api/auth/restablecer-password` | — | Paso 3: restablecer contraseña con token |

### Perfil (`/api/perfil`)

| Método | Ruta | Auth | Descripción |
|--------|------|:----:|-------------|
| GET | `/api/perfil` | JWT | Ver perfil del usuario autenticado |
| PUT | `/api/perfil` | JWT | Actualizar datos del perfil |
| PUT | `/api/perfil/password` | JWT | Cambiar contraseña |

### Catálogo público (`/api/catalogo`)

| Método | Ruta | Auth | Descripción |
|--------|------|:----:|-------------|
| GET | `/api/catalogo` | — | Catálogo paginado de artículos aprobados |
| GET | `/api/catalogo/ofertas` | — | Artículos en oferta activos |
| GET | `/api/catalogo/buscar` | — | Búsqueda full-text por nombre/descripción |
| GET | `/api/catalogo/:id` | — | Detalle de un artículo |
| POST | `/api/catalogo/:id/vista` | — | Registrar una vista en el artículo |

### Categorías (`/api/categorias`)

| Método | Ruta | Auth | Descripción |
|--------|------|:----:|-------------|
| GET | `/api/categorias` | — | Listar categorías activas |

### Notificaciones (`/api/notificaciones`)

| Método | Ruta | Auth | Descripción |
|--------|------|:----:|-------------|
| GET | `/api/notificaciones` | JWT | Notificaciones del usuario autenticado |
| GET | `/api/notificaciones/no-leidas/count` | JWT | Conteo de notificaciones no leídas |
| PUT | `/api/notificaciones/:id/leer` | JWT | Marcar notificación como leída |
| PUT | `/api/notificaciones/leer-todas` | JWT | Marcar todas las notificaciones como leídas |

### Mis artículos — Vendedor (`/api/mis-articulos`)

| Método | Ruta | Auth | Descripción |
|--------|------|:----:|-------------|
| GET | `/api/mis-articulos` | Vendedor | Listar artículos del vendedor autenticado |
| GET | `/api/mis-articulos/:id` | Vendedor | Detalle de un artículo propio |
| POST | `/api/mis-articulos` | Vendedor | Crear nuevo artículo |
| PUT | `/api/mis-articulos/:id` | Vendedor | Editar artículo propio |
| PUT | `/api/mis-articulos/:id/estado` | Vendedor | Cambiar estado del artículo |
| POST | `/api/mis-articulos/:id/imagenes` | Vendedor | Subir imagen al artículo |
| GET | `/api/mis-articulos/:id/imagenes` | Vendedor | Listar imágenes del artículo |

### Imágenes (`/api/imagenes`)

| Método | Ruta | Auth | Descripción |
|--------|------|:----:|-------------|
| PUT | `/api/imagenes/:id/principal` | Vendedor | Establecer imagen como principal |
| DELETE | `/api/imagenes/:id` | Vendedor | Eliminar imagen |

### Administración (`/api/admin`)

| Método | Ruta | Auth | Descripción |
|--------|------|:----:|-------------|
| GET | `/api/admin/estadisticas` | Admin | Estadísticas del dashboard |
| GET | `/api/admin/usuarios` | Admin | Listar todos los usuarios |
| GET | `/api/admin/usuarios/:id` | Admin | Detalle de un usuario |
| GET | `/api/admin/usuarios/:id/articulos` | Admin | Artículos de un usuario específico |
| PUT | `/api/admin/usuarios/:id/suspender` | Admin | Suspender usuario |
| PUT | `/api/admin/usuarios/:id/reactivar` | Admin | Reactivar usuario |
| PATCH | `/api/admin/usuarios/:id/activar` | Admin | Activar usuario |
| GET | `/api/admin/articulos` | Admin | Listar todos los artículos |
| GET | `/api/admin/articulos/en-revision` | Admin | Artículos pendientes de revisión |
| PUT | `/api/admin/articulos/:id/aprobar` | Admin | Aprobar artículo |
| PUT | `/api/admin/articulos/:id/rechazar` | Admin | Rechazar artículo |
| PUT | `/api/admin/articulos/:id/moderar` | Admin | Moderar artículo activo |
| GET | `/api/admin/historial` | Admin | Historial de moderación |
| GET | `/api/admin/historial-usuarios` | Admin | Historial de suspensiones de usuarios |
| POST | `/api/admin/categorias` | Admin | Crear categoría |
| PUT | `/api/admin/categorias/:id` | Admin | Editar categoría |
| DELETE | `/api/admin/categorias/:id` | Admin | Eliminar categoría |
| GET | `/api/admin/categorias/estadisticas` | Admin | Estadísticas por categoría |

### Archivos estáticos

| Ruta | Descripción |
|------|-------------|
| `GET /uploads/images/:filename` | Servir imágenes subidas por los vendedores |

---

## Licencia

MIT — ver archivo [LICENSE](./LICENSE).
