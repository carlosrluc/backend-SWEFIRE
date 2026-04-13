const router = require('express').Router();
const c = require('../controllers/presupuesto.controller');

/**
 * @openapi
 * tags:
 *   - name: Presupuesto
 *     description: Gestión de presupuestos internos
 *   - name: Presupuesto - Material Directo
 *     description: Materiales directos del presupuesto
 *   - name: Presupuesto - Mano de Obra
 *     description: Mano de obra del presupuesto
 *   - name: Presupuesto - Servicios
 *     description: Servicios del presupuesto
 *   - name: Presupuesto - Costos Indirectos
 *     description: Costos indirectos del presupuesto
 *   - name: Presupuesto - Gastos Administrativos
 *     description: Gastos administrativos del presupuesto
 */

/**
 * @openapi
 * /api/presupuestos:
 *   get:
 *     tags: [Presupuesto]
 *     summary: Listar todos los presupuestos
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
 *         description: Lista de presupuestos con metadatos de paginación
 *   post:
 *     tags: [Presupuesto]
 *     summary: Crear un presupuesto interno
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [ID_Cotizacion]
 *             properties:
 *               ID_Cotizacion: { type: integer }
 *               costos_indirectos: { type: number }
 *               coste_total_estimado: { type: number }
 *     responses:
 *       201:
 *         description: Presupuesto creado
 */
router.get('/', c.getAll);
router.post('/', c.create);

/**
 * @openapi
 * /api/presupuestos/{id}:
 *   get:
 *     tags: [Presupuesto]
 *     summary: Obtener presupuesto por ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Presupuesto encontrado
 *       404:
 *         description: No encontrado
 *   put:
 *     tags: [Presupuesto]
 *     summary: Actualizar presupuesto
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
 *               ID_Cotizacion: { type: integer }
 *               costos_indirectos: { type: number }
 *               coste_total_estimado: { type: number }
 *     responses:
 *       200:
 *         description: Actualizado
 *   delete:
 *     tags: [Presupuesto]
 *     summary: Eliminar presupuesto
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
 * /api/presupuestos/{id}/material-directo:
 *   get:
 *     tags: [Presupuesto - Material Directo]
 *     summary: Listar materiales directos
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Lista de materiales
 *   post:
 *     tags: [Presupuesto - Material Directo]
 *     summary: Agregar material directo
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
 *               costo: { type: number }
 *     responses:
 *       201:
 *         description: Material creado
 */
router.get('/:id/material-directo', c.getMaterialDirecto);
router.post('/:id/material-directo', c.createMaterialDirecto);

/**
 * @openapi
 * /api/presupuestos/{id}/material-directo/{sid}:
 *   delete:
 *     tags: [Presupuesto - Material Directo]
 *     summary: Eliminar material directo
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
router.delete('/:id/material-directo/:sid', c.deleteMaterialDirecto);

/**
 * @openapi
 * /api/presupuestos/{id}/mano-obra:
 *   get:
 *     tags: [Presupuesto - Mano de Obra]
 *     summary: Listar mano de obra
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Lista de mano de obra
 *   post:
 *     tags: [Presupuesto - Mano de Obra]
 *     summary: Agregar mano de obra
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
 *               profesion_ejercida: { type: string }
 *               costo_x_hora: { type: number }
 *               costo_general: { type: number }
 *     responses:
 *       201:
 *         description: Creado
 */
router.get('/:id/mano-obra', c.getManoObra);
router.post('/:id/mano-obra', c.createManoObra);

/**
 * @openapi
 * /api/presupuestos/{id}/mano-obra/{sid}:
 *   delete:
 *     tags: [Presupuesto - Mano de Obra]
 *     summary: Eliminar mano de obra
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
router.delete('/:id/mano-obra/:sid', c.deleteManoObra);

/**
 * @openapi
 * /api/presupuestos/{id}/servicios:
 *   get:
 *     tags: [Presupuesto - Servicios]
 *     summary: Listar servicios del presupuesto
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Lista de servicios
 *   post:
 *     tags: [Presupuesto - Servicios]
 *     summary: Agregar servicio al presupuesto
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
 *               nombre_servicio: { type: string }
 *               costo: { type: number }
 *     responses:
 *       201:
 *         description: Creado
 */
router.get('/:id/servicios', c.getServicio);
router.post('/:id/servicios', c.createServicio);

/**
 * @openapi
 * /api/presupuestos/{id}/servicios/{sid}:
 *   delete:
 *     tags: [Presupuesto - Servicios]
 *     summary: Eliminar servicio del presupuesto
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
 * /api/presupuestos/{id}/costos-indirectos:
 *   get:
 *     tags: [Presupuesto - Costos Indirectos]
 *     summary: Listar costos indirectos
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Lista de costos indirectos
 *   post:
 *     tags: [Presupuesto - Costos Indirectos]
 *     summary: Agregar costo indirecto
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
 *               nombre_costo: { type: string }
 *               costo: { type: number }
 *     responses:
 *       201:
 *         description: Creado
 */
router.get('/:id/costos-indirectos', c.getCostoIndirecto);
router.post('/:id/costos-indirectos', c.createCostoIndirecto);

/**
 * @openapi
 * /api/presupuestos/{id}/costos-indirectos/{sid}:
 *   delete:
 *     tags: [Presupuesto - Costos Indirectos]
 *     summary: Eliminar costo indirecto
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
router.delete('/:id/costos-indirectos/:sid', c.deleteCostoIndirecto);

/**
 * @openapi
 * /api/presupuestos/{id}/gastos-admin:
 *   get:
 *     tags: [Presupuesto - Gastos Administrativos]
 *     summary: Listar gastos administrativos
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Lista de gastos
 *   post:
 *     tags: [Presupuesto - Gastos Administrativos]
 *     summary: Agregar gasto administrativo
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
 *               nombre_gasto: { type: string }
 *               costo: { type: number }
 *     responses:
 *       201:
 *         description: Creado
 */
router.get('/:id/gastos-admin', c.getGastoAdmin);
router.post('/:id/gastos-admin', c.createGastoAdmin);

/**
 * @openapi
 * /api/presupuestos/{id}/gastos-admin/{sid}:
 *   delete:
 *     tags: [Presupuesto - Gastos Administrativos]
 *     summary: Eliminar gasto administrativo
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
router.delete('/:id/gastos-admin/:sid', c.deleteGastoAdmin);

module.exports = router;
