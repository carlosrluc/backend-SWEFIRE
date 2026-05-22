const router = require('express').Router();
const c = require('../controllers/presupuesto.controller');
const uploadPrueba = require('../middlewares/uploadPrueba.middleware');

/**
 * @openapi
 * tags:
 *   - name: Presupuesto
 *     description: Gestión de presupuesto unificado
 */

/**
 * @openapi
 * /api/presupuestos/cotizacion/{id}:
 *   get:
 *     tags: [Presupuesto]
 *     summary: Listar presupuesto de una cotización
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *       - in: query
 *         name: tipo
 *         required: false
 *         schema: { type: string, enum: ['Material Directo','Mano de Obra','Servicios','Gastos Administrativos','Costos Indirectos'] }
 *     responses:
 *       200:
 *         description: Lista de items de presupuesto
 *   post:
 *     tags: [Presupuesto]
 *     summary: Agregar item al presupuesto
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
 *               tipo: { type: string, enum: ['Material Directo','Mano de Obra','Servicios','Gastos Administrativos','Costos Indirectos'] }
 *               nombre_gasto: { type: string }
 *               costo_unitario: { type: number }
 *               cantidad: { type: number }
 *               costo_total: { type: number }
 *               costo_x_hora: { type: number }
 *               hora_total: { type: number }
 *               dias_trabajados: { type: integer }
 *               estancia: { type: string, enum: ['para proyecto','para inventario'] }
 *     responses:
 *       201:
 *         description: Item creado
 */
router.get('/cotizacion/:id', c.getByCotizacion);
router.post('/cotizacion/:id', c.createItem);

/**
 * @openapi
 * /api/presupuestos/cotizacion/{id}/totales:
 *   get:
 *     tags: [Presupuesto]
 *     summary: Obtener totales del presupuesto
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Totales globales y por tipo
 */
router.get('/cotizacion/:id/totales', c.getTotales);

/**
 * @openapi
 * /api/presupuestos/item/{idItem}:
 *   put:
 *     tags: [Presupuesto]
 *     summary: Actualizar item presupuestado
 *     parameters:
 *       - in: path
 *         name: idItem
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               tipo: { type: string }
 *               nombre_gasto: { type: string }
 *               costo_unitario: { type: number }
 *               cantidad: { type: number }
 *               costo_total: { type: number }
 *               costo_x_hora: { type: number }
 *               hora_total: { type: number }
 *               dias_trabajados: { type: integer }
 *               estancia: { type: string }
 *     responses:
 *       200:
 *         description: Item actualizado
 *   delete:
 *     tags: [Presupuesto]
 *     summary: Eliminar item presupuestado
 *     parameters:
 *       - in: path
 *         name: idItem
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Item eliminado
 */
router.put('/item/:idItem', c.updateItem);
router.delete('/item/:idItem', c.deleteItem);

/**
 * @openapi
 * /api/presupuestos/item/{idItem}/gasto-real:
 *   put:
 *     tags: [Presupuesto]
 *     summary: Registrar gasto real (Sube comprobante)
 *     parameters:
 *       - in: path
 *         name: idItem
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               costo_real: { type: number }
 *               razon: { type: string }
 *               prueba: { type: string, format: binary }
 *     responses:
 *       200:
 *         description: Gasto real registrado
 */
router.put('/item/:idItem/gasto-real', uploadPrueba.single('prueba'), c.registrarGastoReal);

module.exports = router;
