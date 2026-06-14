const router = require('express').Router();
const c = require('../controllers/servicio.controller');
const { uploadServicioFoto } = require('../middlewares/upload.middleware');

/**
 * @openapi
 * tags:
 *   - name: Servicio
 *     description: Gestión de servicios ofrecidos
 *   - name: Servicio - Personal Requerido
 *     description: Personal requerido por cada servicio
 *   - name: Servicio - Inventario Requerido
 *     description: Materiales de referencia requeridos por cada servicio
 *   - name: Servicio - Público
 *     description: Endpoints públicos del catálogo de servicios (sin autenticación)
 */

/**
 * @openapi
 * components:
 *   schemas:
 *     ServicioPublico:
 *       type: object
 *       description: Servicio activo expuesto al catálogo público (sin precio_regular)
 *       properties:
 *         ID_Servicio:
 *           type: integer
 *           example: 3
 *         nombre:
 *           type: string
 *           example: Contraincendios
 *         descripcion:
 *           type: string
 *           example: Instalación y mantenimiento de sistemas contra incendio
 *         condicional_precio:
 *           type: string
 *           nullable: true
 *         observaciones:
 *           type: string
 *           nullable: true
 *         Estado:
 *           type: string
 *           enum: [Activo]
 *           example: Activo
 *         foto:
 *           type: string
 *           nullable: true
 *           example: /uploads/servicios/foto_1710000000-123.jpeg
 *     ServicioPublicoListResponse:
 *       type: object
 *       properties:
 *         data:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/ServicioPublico'
 */

/**
 * @openapi
 * /api/servicios:
 *   get:
 *     tags: [Servicio]
 *     summary: Listar todos los servicios
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *         description: Número de página
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 *         description: Cantidad de resultados por página
 *     responses:
 *       200:
 *         description: Lista de servicios con metadatos de paginación
 *   post:
 *     tags: [Servicio]
 *     summary: Crear un servicio
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [nombre]
 *             properties:
 *               nombre: { type: string, example: "Contraincendios" }
 *               descripcion: { type: string }
 *               precio_regular: { type: number }
 *               condicional_precio: { type: string }
 *               observaciones: { type: string }
 *               Estado: { type: string, enum: [Activo, Desactivado] }
 *               foto: { type: string, nullable: true, description: 'URL relativa; usar POST /servicios/{id}/foto para subir imagen' }
 *     responses:
 *       201:
 *         description: Servicio creado
 */
router.get('/', c.getAll);
router.post('/', c.create);

/**
 * @openapi
 * /api/servicios/publicos:
 *   get:
 *     tags: [Servicio - Público, Servicio]
 *     summary: Catálogo público de servicios activos
 *     description: |
 *       **Ruta pública** (no requiere Bearer).
 *
 *       Devuelve todos los servicios con `Estado = "Activo"`, excluye el servicio **ID 7** (envío/recojo)
 *       y **no incluye** el campo `precio_regular`.
 *     security: []
 *     responses:
 *       200:
 *         description: Lista de servicios públicos
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ServicioPublicoListResponse'
 *             example:
 *               data:
 *                 - ID_Servicio: 3
 *                   nombre: Contraincendios
 *                   descripcion: Instalación y mantenimiento
 *                   condicional_precio: null
 *                   observaciones: null
 *                   Estado: Activo
 *                   foto: /uploads/servicios/foto_1710000000-123.jpeg
 *       500:
 *         description: Error del servidor
 */
router.get('/publicos', c.getPublico);

/**
 * @openapi
 * /api/servicios/{id}/principal:
 *   get:
 *     tags: [Servicio]
 *     summary: Plantilla del servicio como principal (etapas, actividades y subservicios recomendados)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Plantilla para armar POST de solicitud
 *       404:
 *         description: Servicio no encontrado
 */
router.get('/:id/principal', c.getPrincipal);

/**
 * @openapi
 * /api/servicios/{id}:
 *   get:
 *     tags: [Servicio]
 *     summary: Obtener servicio por ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Servicio encontrado
 *       404:
 *         description: No encontrado
 *   put:
 *     tags: [Servicio]
 *     summary: Actualizar servicio
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nombre: { type: string }
 *               descripcion: { type: string }
 *               precio_regular: { type: number }
 *               condicional_precio: { type: string }
 *               observaciones: { type: string }
 *               Estado: { type: string, enum: [Activo, Desactivado] }
 *     responses:
 *       200:
 *         description: Actualizado
 *   delete:
 *     tags: [Servicio]
 *     summary: Eliminar servicio
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Eliminado
 */
router.get('/:id', c.getById);
router.put('/:id', c.update);
router.delete('/:id', c.remove);

/**
 * @openapi
 * /api/servicios/{id}/foto:
 *   get:
 *     tags: [Servicio - Público, Servicio]
 *     summary: Ver/descargar fotografía del servicio (PNG/JPEG)
 *     description: |
 *       **Ruta pública** (no requiere Bearer).
 *       Redirige a la URL guardada en `SERVICIO.foto` (ej. `/uploads/servicios/foto_xxx.jpeg`).
 *     security: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       302:
 *         description: Imagen del servicio
 *       404:
 *         description: Servicio o fotografía no encontrada
 *   post:
 *     tags: [Servicio]
 *     summary: Subir fotografía del servicio (PNG/JPEG)
 *     description: |
 *       Guarda el archivo en el servidor y persiste en BD una URL relativa (no la ruta local del cliente).
 *       Reemplaza la foto anterior si existía.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [foto]
 *             properties:
 *               foto:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Fotografía subida
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string, example: 'Fotografía subida' }
 *                 url: { type: string, example: '/uploads/servicios/foto_1710000000-123.jpeg' }
 *       400:
 *         description: Archivo no enviado o formato no permitido
 *       404:
 *         description: Servicio no encontrado
 */
router.get('/:id/foto', c.getFoto);
router.post('/:id/foto', uploadServicioFoto.single('foto'), c.uploadFoto);

/**
 * @openapi
 * /api/servicios/{id}/personal:
 *   get:
 *     tags: [Servicio - Personal Requerido]
 *     summary: Listar personal requerido del servicio
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Lista de personal requerido
 *   post:
 *     tags: [Servicio - Personal Requerido]
 *     summary: Agregar personal requerido al servicio
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               profesion: { type: string }
 *               cantidad: { type: integer }
 *               disponibilidad: { type: string }
 *               requerimiento_legal: { type: string }
 *     responses:
 *       201:
 *         description: Personal creado
 */
router.get('/:id/personal', c.getPersonal);
router.post('/:id/personal', c.createPersonal);

/**
 * @openapi
 * /api/servicios/{id}/personal/{pid}:
 *   put:
 *     tags: [Servicio - Personal Requerido]
 *     summary: Actualizar personal requerido
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *       - in: path
 *         name: pid
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               profesion: { type: string }
 *               cantidad: { type: integer }
 *               disponibilidad: { type: string }
 *               requerimiento_legal: { type: string }
 *     responses:
 *       200:
 *         description: Personal actualizado
 *   delete:
 *     tags: [Servicio - Personal Requerido]
 *     summary: Eliminar personal requerido
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *       - in: path
 *         name: pid
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Eliminado
 */
router.put('/:id/personal/:pid', c.updatePersonal);
router.delete('/:id/personal/:pid', c.deletePersonal);

/**
 * @openapi
 * components:
 *   schemas:
 *     ServicioInventarioRequerido:
 *       type: object
 *       properties:
 *         ID_Servicio:
 *           type: integer
 *           example: 1
 *         Id_Objeto:
 *           type: integer
 *           example: 5
 *         cantidad:
 *           type: integer
 *           example: 2
 *         estancia:
 *           type: string
 *           enum: ['para proyecto', 'para inventario']
 *           example: 'para inventario'
 *         nombre_objeto:
 *           type: string
 *           example: 'Extintor PQS 6kg'
 *     ServicioInventarioRequeridoInput:
 *       type: object
 *       required: [Id_Objeto, cantidad]
 *       properties:
 *         Id_Objeto:
 *           type: integer
 *           example: 5
 *         cantidad:
 *           type: integer
 *           minimum: 1
 *           example: 2
 *         estancia:
 *           type: string
 *           enum: ['para proyecto', 'para inventario']
 *           default: 'para inventario'
 *     ServicioInventarioRequeridoUpdate:
 *       type: object
 *       properties:
 *         cantidad:
 *           type: integer
 *           minimum: 1
 *           example: 3
 *         estancia:
 *           type: string
 *           enum: ['para proyecto', 'para inventario']
 */

/**
 * @openapi
 * /api/servicios/{id}/inventario-requerido:
 *   get:
 *     tags: [Servicio - Inventario Requerido]
 *     summary: Listar inventario requerido del servicio (SERVICIO_INVENTARIO_REQUERIDO)
 *     description: Materiales de referencia por servicio. No mueve stock hasta asignar a un proyecto.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *         description: ID_Servicio
 *     responses:
 *       200:
 *         description: Lista de materiales requeridos
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/ServicioInventarioRequerido'
 *       500:
 *         description: Error del servidor
 *   post:
 *     tags: [Servicio - Inventario Requerido]
 *     summary: Crear registro en SERVICIO_INVENTARIO_REQUERIDO
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *         description: ID_Servicio
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ServicioInventarioRequeridoInput'
 *     responses:
 *       201:
 *         description: Registro creado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string, example: 'Inventario requerido creado' }
 *                 ID_Servicio: { type: integer }
 *                 Id_Objeto: { type: integer }
 *                 cantidad: { type: integer }
 *                 estancia: { type: string }
 *       400:
 *         description: Datos inválidos
 *       404:
 *         description: Servicio u objeto de inventario no encontrado
 *       409:
 *         description: El objeto ya está registrado para este servicio
 *       500:
 *         description: Error del servidor
 */
router.get('/:id/inventario-requerido', c.getInventarioRequerido);
router.post('/:id/inventario-requerido', c.createInventarioRequerido);

/**
 * @openapi
 * /api/servicios/{id}/inventario-requerido/{idObjeto}:
 *   get:
 *     tags: [Servicio - Inventario Requerido]
 *     summary: Obtener un material requerido del servicio
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *         description: ID_Servicio
 *       - in: path
 *         name: idObjeto
 *         required: true
 *         schema: { type: integer }
 *         description: Id_Objeto (clave compuesta con ID_Servicio)
 *     responses:
 *       200:
 *         description: Registro encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ServicioInventarioRequerido'
 *       404:
 *         description: No encontrado
 *       500:
 *         description: Error del servidor
 *   put:
 *     tags: [Servicio - Inventario Requerido]
 *     summary: Actualizar cantidad o estancia
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *         description: ID_Servicio
 *       - in: path
 *         name: idObjeto
 *         required: true
 *         schema: { type: integer }
 *         description: Id_Objeto
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ServicioInventarioRequeridoUpdate'
 *     responses:
 *       200:
 *         description: Actualizado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string }
 *                 ID_Servicio: { type: integer }
 *                 Id_Objeto: { type: integer }
 *                 cantidad: { type: integer }
 *                 estancia: { type: string }
 *       400:
 *         description: Datos inválidos
 *       404:
 *         description: No encontrado
 *       500:
 *         description: Error del servidor
 *   delete:
 *     tags: [Servicio - Inventario Requerido]
 *     summary: Eliminar registro de SERVICIO_INVENTARIO_REQUERIDO
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *         description: ID_Servicio
 *       - in: path
 *         name: idObjeto
 *         required: true
 *         schema: { type: integer }
 *         description: Id_Objeto
 *     responses:
 *       200:
 *         description: Eliminado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string, example: 'Inventario requerido eliminado' }
 *       404:
 *         description: No encontrado
 *       500:
 *         description: Error del servidor
 */
router.get('/:id/inventario-requerido/:idObjeto', c.getInventarioRequeridoByObjeto);
router.put('/:id/inventario-requerido/:idObjeto', c.updateInventarioRequerido);
router.delete('/:id/inventario-requerido/:idObjeto', c.deleteInventarioRequerido);

// ── Etapas, actividades y subservicios del flujo por defecto ─────────────────
router.get('/:id/etapas', c.getEtapas);
router.post('/:id/etapas', c.createEtapa);
router.put('/:id/etapas/:eid', c.updateEtapa);
router.delete('/:id/etapas/:eid', c.deleteEtapa);

router.get('/:id/etapas/:eid/actividades', c.getActividades);
router.post('/:id/etapas/:eid/actividades', c.createActividad);
router.put('/:id/etapas/:eid/actividades/:aid', c.updateActividad);
router.delete('/:id/etapas/:eid/actividades/:aid', c.deleteActividad);

router.get('/:id/subservicios', c.getSubservicios);
router.post('/:id/subservicios', c.createSubservicio);
router.put('/:id/subservicios/:sid', c.updateSubservicio);
router.delete('/:id/subservicios/:sid', c.deleteSubservicio);

module.exports = router;
