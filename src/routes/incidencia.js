const router = require('express').Router();
const c = require('../controllers/incidencia.controller');
const auth = require('../middlewares/auth.middleware');
const { permit } = require('../middlewares/role.middleware');

/**
 * @openapi
 * tags:
 *   - name: Incidencias
 *     description: Gestión de incidencias
 */

/**
 * @openapi
 * components:
 *   schemas:
 *     Incidencia:
 *       type: object
 *       properties:
 *         id_incidencia: { type: integer }
 *         nombre_incidencia: { type: string, maxLength: 100, example: 'Pérdida extintor sector A' }
 *         id_proyecto: { type: integer }
 *         empresa_involucrada: { type: string }
 *         cotizacion_remuneracion: { type: integer }
 *         comentario: { type: string }
 *         estado:
 *           type: string
 *           enum:
 *             - 'Sin enviar'
 *             - 'Cotizacion sin respuesta'
 *             - 'Cotizacion disputada'
 *             - 'Pago por recibir'
 *             - 'Pago realizado'
 *             - 'Material recuperado'
 *         Cotizacion_Nombre: { type: string }
 *         Cliente_Nombre: { type: string }
 *     IncidenciaInput:
 *       type: object
 *       properties:
 *         nombre_incidencia: { type: string, maxLength: 100 }
 *         id_proyecto: { type: integer }
 *         empresa_involucrada: { type: string }
 *         cotizacion_remuneracion: { type: integer }
 *         comentario: { type: string }
 *         estado: { type: string }
 */

/**
 * @openapi
 * /api/incidencias:
 *   get:
 *     tags: [Incidencias]
 *     summary: Listar todas las incidencias
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 *       - in: query
 *         name: nombre
 *         schema: { type: string }
 *         description: Filtrar por nombre_incidencia (coincidencia parcial)
 *       - in: query
 *         name: estado
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Lista de incidencias
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Incidencia'
 *   post:
 *     tags: [Incidencias]
 *     summary: Crear incidencia
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/IncidenciaInput'
 *     responses:
 *       201:
 *         description: Incidencia creada
 */
router.get('/', auth, permit(['cliente', 'abogado', 'trabajtaller', 'gerente', 'adminproy', 'supervisorcampo']), c.getAll);
router.post('/', auth, permit(['abogado', 'gerente', 'adminproy', 'supervisorcampo']), c.create);

/**
 * @openapi
 * /api/incidencias/proyecto/{id_proyecto}:
 *   get:
 *     tags: [Incidencias]
 *     summary: Listar incidencias por ID de proyecto
 *     description: |
 *       Devuelve las filas de INCIDENCIA donde id_proyecto coincide.
 *       Equivalente a GET /api/proyectos/{id}/incidencias.
 *     parameters:
 *       - in: path
 *         name: id_proyecto
 *         required: true
 *         schema: { type: integer }
 *         description: id_Proyecto
 *       - in: query
 *         name: nombre
 *         schema: { type: string }
 *         description: Filtrar por nombre_incidencia (coincidencia parcial)
 *       - in: query
 *         name: estado
 *         required: false
 *         schema:
 *           type: string
 *           enum:
 *             - 'Sin enviar'
 *             - 'Cotizacion sin respuesta'
 *             - 'Cotizacion disputada'
 *             - 'Pago por recibir'
 *             - 'Pago realizado'
 *             - 'Material recuperado'
 *     responses:
 *       200:
 *         description: Incidencias del proyecto
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id_Proyecto: { type: integer }
 *                 Proyecto_Nombre: { type: string }
 *                 total: { type: integer }
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Incidencia'
 *       404:
 *         description: Proyecto no encontrado
 */
router.get('/proyecto/:id_proyecto', auth, permit(['cliente', 'abogado', 'trabajtaller', 'gerente', 'adminproy', 'supervisorcampo']), c.getByProyecto);

/**
 * @openapi
 * /api/incidencias/{id}:
 *   get:
 *     tags: [Incidencias]
 *     summary: Obtener incidencia por ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Incidencia encontrada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Incidencia'
 *   put:
 *     tags: [Incidencias]
 *     summary: Actualizar incidencia
 *     description: Campos enviados reemplazan los existentes; los omitidos se conservan.
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
 *             $ref: '#/components/schemas/IncidenciaInput'
 *     responses:
 *       200:
 *         description: Actualizada
 *   delete:
 *     tags: [Incidencias]
 *     summary: Eliminar incidencia
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Eliminada
 */
router.get('/:id', auth, permit(['cliente', 'abogado', 'trabajtaller', 'gerente', 'adminproy', 'supervisorcampo']), c.getById);
router.put('/:id', auth, permit(['abogado', 'gerente', 'adminproy', 'supervisorcampo']), c.update);
router.delete('/:id', auth, permit(['gerente', 'adminproy']), c.remove);

/**
 * @openapi
 * /api/incidencias/{id}/objetos:
 *   get:
 *     tags: [Incidencias]
 *     summary: Listar objetos y camiones de la incidencia
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Lista de objetos de la incidencia
 *   post:
 *     tags: [Incidencias]
 *     summary: Agregar objeto/camión a incidencia
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
 *               id_proyecto_inventario: { type: integer }
 *               id_proyecto_camion: { type: integer }
 *               ocurrencia_inventario: { type: string, enum: ['averia','perdida','robo','por mantener','otro'] }
 *               ocurrencia_camion: { type: string, enum: ['averia','perdida','robo','por mantener','otro','ninguna'] }
 *               fecha_perdida: { type: string, format: date-time }
 *               cantidad: { type: integer }
 *               ultima_ubicacion: { type: string }
 *               comentario: { type: string }
 *               precio_remunerar: { type: number }
 *     responses:
 *       201:
 *         description: Objeto agregado
 */
router.get('/:id/objetos', auth, permit(['cliente', 'abogado', 'trabajtaller', 'gerente', 'adminproy', 'supervisorcampo']), c.getObjetos);
router.post('/:id/objetos', auth, permit(['abogado', 'gerente', 'adminproy', 'supervisorcampo']), c.createObjeto);

/**
 * @openapi
 * /api/incidencias/{id}/objetos/{oid}:
 *   delete:
 *     tags: [Incidencias]
 *     summary: Eliminar objeto de incidencia
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *       - in: path
 *         name: oid
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Objeto eliminado
 */
router.delete('/:id/objetos/:oid', auth, permit(['gerente', 'adminproy']), c.deleteObjeto);

/**
 * @openapi
 * /api/incidencias/{id}/involucrados:
 *   get:
 *     tags: [Incidencias]
 *     summary: Listar involucrados de la incidencia
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Lista de involucrados
 *   post:
 *     tags: [Incidencias]
 *     summary: Agregar involucrado a incidencia
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
 *             required: [dni_involucrado, id_trabajo]
 *             properties:
 *               dni_involucrado: { type: string }
 *               id_trabajo: { type: integer }
 *               version_de_hechos: { type: string }
 *               comentario: { type: string }
 *     responses:
 *       201:
 *         description: Involucrado agregado
 */
router.get('/:id/involucrados', auth, permit(['cliente', 'abogado', 'trabajtaller', 'gerente', 'adminproy', 'supervisorcampo']), c.getInvolucrados);
router.post('/:id/involucrados', auth, permit(['abogado', 'gerente', 'adminproy', 'supervisorcampo']), c.createInvolucrado);

/**
 * @openapi
 * /api/incidencias/{id}/involucrados/{ivid}:
 *   delete:
 *     tags: [Incidencias]
 *     summary: Eliminar involucrado de incidencia
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *       - in: path
 *         name: ivid
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Eliminado
 */
router.delete('/:id/involucrados/:ivid', auth, permit(['gerente', 'adminproy']), c.deleteInvolucrado);

module.exports = router;
