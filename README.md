# backend-SWEFIRE
Backend con MariaDB para el proyecto SWEFIRE.

## instalado por terminal
que se ha instalado?
express: framework para crear el servidor y manejar rutas/API
mariadb: base de datos relacional para almacenar la información
dotenv: carga variables de entorno desde un archivo .env
cors: permite controlar el acceso de otros dominios al backend
swagger-ui-express: muestra la documentación interactiva de la API en el navegador
swagger-jsdoc: genera la documentación Swagger a partir de comentarios en el código
nodemon: reinicia automáticamente el servidor al detectar cambios en el código
## Pasos para iniciar el proyecto

1.  **Configurar base de datos**: Asegúrate de tener MariaDB corriendo y crea una base de datos con el nombre especificado en el archivo `.env`.
2.  **Instalar dependencias**: (Ya realizado por el usuario).
    ```bash
    npm install
    ```
3.  **Configurar entorno**: Edita el archivo `.env` con tus credenciales de MariaDB.
4.  **Iniciar servidor**:
    - Desarrollo (con recarga automática): `npm run dev`
    - Producción: `npm start`
5.  **Ver documentación**: Accede a `http://localhost:3000/api-docs` para ver Swagger UI.

## Estructura de carpetas
- `src/config`: Configuración de base de datos.
- `src/controllers`: Lógica de los endpoints.
- `src/models`: Definición de esquemas/tablas.
- `src/routes`: Definición de rutas y documentación Swagger.
- `src/app.js`: Configuración de Express y Middleware.
- `src/server.js`: Punto de entrada del servidor.

## Como Arrancar MariaDB
- Instalar MariaDB en https://mariadb.org
- Intalarlo y poner una contrasena que recuerdes para la raiz cuando el instalador te lo pida
- Entrar al cmd en modo administrador
- ingresar cd \Program Files\MariaDB 12.0\bin (esto puede variar segun la version de mariadb o la ubicacion en la que este halla sido instalada)
- ingresar mysql -u root -p
- te pedira la contrasena, tipearla y dar enter
- ya estaras dentro de mariadb
- en el archivo .env poner las mismas credenciales y la contrasena que utilizaste en mariadb