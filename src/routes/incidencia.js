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
 *     responses:
 *       200:
 *         description: Lista de incidencias
 *   post:
 *     tags: [Incidencias]
 *     summary: Crear incidencia
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               id_proyecto: { type: integer }
 *               empresa_involucrada: { type: string }
 *               cotizacion_remuneracion: { type: integer }
 *               comentario: { type: string }
 *               estado: { type: string }
 *     responses:
 *       201:
 *         description: Incidencia creada
 */
router.get('/', auth, permit(['cliente', 'abogado', 'trabajtaller', 'gerente', 'adminproy', 'supervisorcampo']), c.getAll);
router.post('/', auth, permit(['abogado', 'gerente', 'adminproy', 'supervisorcampo']), c.create);

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
 *   put:
 *     tags: [Incidencias]
 *     summary: Actualizar incidencia
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
 *               id_proyecto: { type: integer }
 *               empresa_involucrada: { type: string }
 *               cotizacion_remuneracion: { type: integer }
 *               comentario: { type: string }
 *               estado: { type: string }
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
