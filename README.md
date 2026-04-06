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

## COMO EDITAR Y CREAR BASE DE DATOS EN MARIA DB
- SE CREA LA DATABASE CON EL SIGUIENTE CODIGO "CREATE DATABASE swefire_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
"
- Para usar la tabla se utiliza: "USE swefire_db;"
- de ahi se pueden CREAR las tablas 
un ejemplo de creacion de tabla es el siguiente:
CREATE TABLE TRABAJO (
    Id_trabajo      INT         AUTO_INCREMENT PRIMARY KEY,
    Id_Proyecto     INT,
    fecha           DATE,
    horario         VARCHAR(100),
    asistencia      TEXT,
    comentario      TEXT,
    FOREIGN KEY (Id_Proyecto) REFERENCES PROYECTO(id_Proyecto) ON DELETE SET NULL
);

Editar una tabla existente (renombrarla)

- RENAME TABLE PERFIL TO EMPLEADO;

Eliminar una tabla

- DROP TABLE PERFIL_EDUCACION;

Eliminar un atributo

- ALTER TABLE PERFIL DROP COLUMN aficiones;

Agregar un atributo

- ALTER TABLE PERFIL ADD COLUMN fecha_ingreso DATE;

Editar un atributo existente (cambiar tipo, nombre, etc.)

- Cambiar tipo de dato
-   ALTER TABLE PERFIL MODIFY COLUMN telefono_contacto VARCHAR(30);

- Cambiar nombre Y tipo a la vez
-   ALTER TABLE PERFIL CHANGE COLUMN telefono_contacto celular VARCHAR(30);

## TRAZ ESTO EN EL CMD SE PONE npm install mysql2
- health.js esta hecho para poder fijarse si la bd esta conectada
- para checar esto se usa npm run dev y luego se entra a http://localhost:3000/api/health o http://localhost:3000/api-docs
## COMO SE POBLO LA DATABASE EN MARIA DB
## NOTA: DECARGAR EL DOCUMENTO DATOS_PRUEBA.SQL Y UBICARLO EN UNA CARPETA QUE RECUERDES PARA QUE USES LA UBICACION DEL .SQL DSP 
- Entrar al cmd en modo admin
- poner cd "C:\Program Files\MariaDB 12.0\bin" o donde este ubicado el mariaDB que descargastes
- poner el siguiente comando mysql -u root -p swefire_db < "C:\ruta\donde\guardaste\datos_prueba.sql"
- te pedira la contrasena, tipearla y dar enter (recordar que la contra es la cual pusiste al instalar mariadb y en el env (usar 9696 para todos usar la misma))
- La base de datos estara poblada si no te sale ningun error

## como gestionar los datos que ya estan en la tabla 
- Quitar todo lo ingresado (borrar todos los datos sin borrar las tablas)
sqlSET FOREIGN_KEY_CHECKS = 0;
DELETE FROM TRABAJO;
DELETE FROM PROYECTO;
-- (repetir con cada tabla)
SET FOREIGN_KEY_CHECKS = 1;

- Ingresar algo nuevo
INSERT INTO CLIENTE (DNI_O_RUC, nombre_comercial, rubro) 
VALUES ('20599999999', 'Nueva Empresa S.A.', 'Industria');

- Editar algo ingresado
UPDATE CLIENTE 
SET nombre_comercial = 'Empresa Actualizada S.A.' 
WHERE DNI_O_RUC = '20599999999';

-Eliminar algo ingresado
DELETE FROM CLIENTE 
WHERE DNI_O_RUC = '20599999999';
(Siempre usa WHERE en UPDATE y DELETE, si no lo pones afecta toda la tabla.)

## COMO USAR EL SWAGGER UI PARA GESTIONAR LA BASE DE DATOS (CRUD)

El proyecto cuenta con una interfaz visual llamada **Swagger UI** en la que puedes leer, crear, editar y eliminar datos de todas las tablas sin escribir código SQL ni usar herramientas externas.

### ¿Qué es Swagger UI?
Es una página web que muestra todos los endpoints (rutas HTTP) disponibles en la API y te permite ejecutarlos directamente desde el navegador. Cada endpoint tiene un formulario donde puedes ingresar los datos y ver la respuesta de la base de datos en tiempo real.

### Cómo abrir Swagger UI
1. Asegúrate de que el servidor esté corriendo: `npm run dev`
2. Abre tu navegador y entra a: `http://localhost:3000/api-docs`
3. Verás un listado de grupos (tags) como "Perfil", "Cliente", "Camión", etc.

---

### Operaciones disponibles por tabla

Cada recurso tiene las siguientes operaciones (métodos HTTP):

| Operación | Método | Descripción |
|-----------|--------|-------------|
| Listar todos | GET | Obtiene todos los registros de la tabla |
| Obtener uno | GET /{id} | Obtiene un registro por su clave primaria |
| Crear | POST | Inserta un nuevo registro |
| Actualizar | PUT /{id} | Edita un registro existente |
| Eliminar | DELETE /{id} | Borra un registro |

Las sub-tablas (como educaciones de un perfil, o mantenimientos de un camión) siguen rutas anidadas, por ejemplo: `GET /api/perfiles/{dni}/educacion`.

---

### Cómo ejecutar un endpoint desde Swagger UI

Ejemplo: **Ver todos los clientes**

1. En Swagger UI, busca el grupo **"Cliente"**
2. Haz clic en el endpoint `GET /api/clientes`
3. Haz clic en el botón **"Try it out"** (esquina derecha)
4. Haz clic en **"Execute"**
5. Debajo aparecerá la respuesta con todos los clientes en formato JSON

---

Ejemplo: **Crear un nuevo cliente**

1. Busca el grupo **"Cliente"**
2. Haz clic en `POST /api/clientes`
3. Haz clic en **"Try it out"**
4. En el campo "Request body" edita el JSON con los datos del cliente:
```json
{
  "DNI_O_RUC": "20512345678",
  "nombre_comercial": "Mi Empresa S.A.",
  "razon_social": "Mi Empresa Sociedad Anonima",
  "rubro": "Industria",
  "ubicacion_facturacion": "Av. Principal 123, Lima",
  "observacion": "Cliente nuevo"
}
```
5. Haz clic en **"Execute"**
6. Recibirás una respuesta `201` indicando que el cliente fue creado

---

Ejemplo: **Actualizar un cliente existente**

1. Busca `PUT /api/clientes/{id}`
2. Haz clic en **"Try it out"**
3. En el campo `id` escribe el DNI o RUC del cliente (ej: `20512345678`)
4. En el body pon solo los campos que quieres cambiar:
```json
{
  "nombre_comercial": "Mi Empresa Actualizada S.A.",
  "rubro": "Comercio"
}
```
5. Haz clic en **"Execute"**

---

Ejemplo: **Eliminar un cliente**

1. Busca `DELETE /api/clientes/{id}`
2. Haz clic en **"Try it out"**
3. Escribe el DNI o RUC en el campo `id`
4. Haz clic en **"Execute"**
5. Recibirás `200` con el mensaje "Cliente eliminado"

> ⚠️ **Atención**: Eliminar un cliente también eliminará automáticamente sus contactos, correos y teléfonos asociados (CASCADE en la base de datos).

---

### Tablas disponibles y sus rutas base

| Recurso | Ruta base |
|---------|-----------|
| Perfiles | `/api/perfiles` |
| Usuarios | `/api/usuarios` |
| Clientes | `/api/clientes` |
| Fabricantes | `/api/fabricantes` |
| Inventario | `/api/inventario` |
| Camiones | `/api/camiones` |
| Servicios | `/api/servicios` |
| Solicitudes | `/api/solicitudes` |
| Cotizaciones | `/api/cotizaciones` |
| Presupuestos | `/api/presupuestos` |
| Proyectos | `/api/proyectos` |
| Trabajos | `/api/trabajos` |

Cada ruta base también tiene sub-rutas para sus tablas relacionadas. Por ejemplo:
- `/api/perfiles/{dni}/educacion` — educaciones del perfil
- `/api/perfiles/{dni}/brevetes` — brevetes del perfil
- `/api/camiones/{placa}/mantenimientos` — mantenimientos del camión
- `/api/trabajos/{id}/rrhh/{rid}/pdfs` — PDFs de un registro RRHH

---

### Claves primarias de cada tabla

| Tabla | Clave primaria | Tipo |
|-------|---------------|------|
| PERFIL | `DNI` | Texto (ej: "12345678") |
| USUARIO | `idusuario` | Número entero |
| CLIENTE | `DNI_O_RUC` | Texto (ej: "20512345678") |
| FABRICANTE | `ID_Fabricante` | Número entero |
| INVENTARIO | `Id_Objeto` | Número entero |
| CAMION | `Placa` | Texto (ej: "ABC-123") |
| SERVICIO | `ID_Servicio` | Número entero |
| SOLICITUD | `ID` | Número entero |
| COTIZACION_COMERCIAL | `ID` | Número entero |
| PRESUPUESTO_INTERNO | `ID` | Número entero |
| PROYECTO | `id_Proyecto` | Número entero |
| TRABAJO | `Id_trabajo` | Número entero |

---

### Errores comunes

- **404 Not Found**: El registro con ese ID no existe en la base de datos
- **500 Internal Server Error**: Revisar que la base de datos esté corriendo y las credenciales en `.env` sean correctas
- **Error de llave foránea**: Si intentas crear un registro que referencia a otro que no existe (ej: crear un usuario con un `dni_perfil` que no está en PERFIL), la base de datos lo rechazará
