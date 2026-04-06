const router = require('express').Router();
const c = require('../controllers/cotizacion.controller');

/**
 * @openapi
 * tags:
 *   - name: Cotización
 *     description: Gestión de cotizaciones comerciales
 *   - name: Cotización - Servicios
 *     description: Servicios incluidos en la cotización
 *   - name: Cotización - Camiones
 *     description: Camiones asignados a la cotización
 *   - name: Cotización - Inventario
 *     description: Inventario en la cotización
 *   - name: Cotización - Personal
 *     description: Personal asignado a la cotización
 */

/**
 * @openapi
 * /api/cotizaciones:
 *   get:
 *     tags: [Cotización]
 *     summary: Listar todas las cotizaciones
 *     responses:
 *       200:
 *         description: Lista de cotizaciones
 *   post:
 *     tags: [Cotización]
 *     summary: Crear una cotización
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               version: { type: integer, example: 1 }
 *               nombre: { type: string }
 *               id_solicitud: { type: integer }
 *               DNI_O_RUC: { type: string }
 *               precio_total: { type: number }
 *               estado: { type: string, enum: [aprobado, "rechazado por cliente", descartada] }
 *               comentario_cliente: { type: string }
 *     responses:
 *       201:
 *         description: Cotización creada
 */
router.get('/', c.getAll);
router.post('/', c.create);

/**
 * @openapi
 * /api/cotizaciones/{id}:
 *   get:
 *     tags: [Cotización]
 *     summary: Obtener cotización por ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Cotización encontrada
 *       404:
 *         description: No encontrada
 *   put:
 *     tags: [Cotización]
 *     summary: Actualizar cotización
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
 *               precio_total: { type: number }
 *               estado: { type: string, enum: [aprobado, "rechazado por cliente", descartada] }
 *               comentario_cliente: { type: string }
 *     responses:
 *       200:
 *         description: Actualizada
 *   delete:
 *     tags: [Cotización]
 *     summary: Eliminar cotización
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Eliminada
 */
router.get('/:id', c.getById);
router.put('/:id', c.update);
router.delete('/:id', c.remove);

/**
 * @openapi
 * /api/cotizaciones/{id}/servicios:
 *   get:
 *     tags: [Cotización - Servicios]
 *     summary: Listar servicios de la cotización
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Lista de servicios
 *   post:
 *     tags: [Cotización - Servicios]
 *     summary: Agregar servicio a la cotización
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
 *             required: [ID_Servicio]
 *             properties:
 *               ID_Servicio: { type: integer }
 *               fecha_inicio: { type: string, format: date }
 *               fecha_finalizacion: { type: string, format: date }
 *               jornada: { type: string }
 *               precio_comercial: { type: number }
 *     responses:
 *       201:
 *         description: Servicio agregado
 */
router.get('/:id/servicios', c.getServicios);
router.post('/:id/servicios', c.createServicio);

/**
 * @openapi
 * /api/cotizaciones/{id}/servicios/{sid}:
 *   delete:
 *     tags: [Cotización - Servicios]
 *     summary: Eliminar servicio de la cotización
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *       - in: path
 *         name: sid
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Eliminado
 */
router.delete('/:id/servicios/:sid', c.deleteServicio);

/**
 * @openapi
 * /api/cotizaciones/{id}/camiones:
 *   get:
 *     tags: [Cotización - Camiones]
 *     summary: Listar camiones de la cotización
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Lista de camiones
 *   post:
 *     tags: [Cotización - Camiones]
 *     summary: Asignar camión a la cotización
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
 *             required: [Placa]
 *             properties:
 *               Placa: { type: string }
 *               uso: { type: string }
 *               fecha_hora_entrada: { type: string, format: date-time }
 *               fecha_hora_salida: { type: string, format: date-time }
 *               ID_Piloto: { type: integer }
 *     responses:
 *       201:
 *         description: Camión asignado
 */
router.get('/:id/camiones', c.getCamiones);
router.post('/:id/camiones', c.createCamion);

/**
 * @openapi
 * /api/cotizaciones/{id}/camiones/{cid}:
 *   delete:
 *     tags: [Cotización - Camiones]
 *     summary: Desasignar camión de la cotización
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *       - in: path
 *         name: cid
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Eliminado
 */
router.delete('/:id/camiones/:cid', c.deleteCamion);

/**
 * @openapi
 * /api/cotizaciones/{id}/inventario:
 *   get:
 *     tags: [Cotización - Inventario]
 *     summary: Listar inventario de la cotización
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Lista de inventario
 *   post:
 *     tags: [Cotización - Inventario]
 *     summary: Agregar inventario a la cotización
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
 *             required: [ID_Inventario]
 *             properties:
 *               ID_Inventario: { type: integer }
 *               cantidad: { type: integer }
 *               intencion: { type: string, enum: [comprar, alquilar] }
 *               dias_alquilados: { type: integer }
 *               precio_comercial: { type: number }
 *     responses:
 *       201:
 *         description: Inventario agregado
 */
router.get('/:id/inventario', c.getInventario);
router.post('/:id/inventario', c.createInventario);

/**
 * @openapi
 * /api/cotizaciones/{id}/inventario/{iid}:
 *   delete:
 *     tags: [Cotización - Inventario]
 *     summary: Eliminar inventario de la cotización
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *       - in: path
 *         name: iid
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Eliminado
 */
router.delete('/:id/inventario/:iid', c.deleteInventario);

/**
 * @openapi
 * /api/cotizaciones/{id}/personal:
 *   get:
 *     tags: [Cotización - Personal]
 *     summary: Listar personal de la cotización
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Lista de personal
 *   post:
 *     tags: [Cotización - Personal]
 *     summary: Asignar personal a la cotización
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
 *             required: [ID_Usuario]
 *             properties:
 *               ID_Usuario: { type: integer }
 *               rol_en_trabajo: { type: string }
 *               fecha_entrada: { type: string, format: date }
 *               fecha_salida: { type: string, format: date }
 *               dias_trabajados: { type: integer }
 *     responses:
 *       201:
 *         description: Personal asignado
 */
router.get('/:id/personal', c.getPersonal);
router.post('/:id/personal', c.createPersonal);

/**
 * @openapi
 * /api/cotizaciones/{id}/personal/{pid}:
 *   delete:
 *     tags: [Cotización - Personal]
 *     summary: Desasignar personal de la cotización
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
router.delete('/:id/personal/:pid', c.deletePersonal);

module.exports = router;
