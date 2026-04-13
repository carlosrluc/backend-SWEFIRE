const router = require('express').Router();
const c = require('../controllers/camion.controller');

/**
 * @openapi
 * tags:
 *   - name: Camión
 *     description: Gestión de camiones
 *   - name: Camión - Mantenimiento
 *     description: Registros de mantenimiento del camión
 *   - name: Camión - Inventario
 *     description: Inventario asignado al camión
 */

/**
 * @openapi
 * /api/camiones:
 *   get:
 *     tags: [Camión]
 *     summary: Listar todos los camiones
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
 *         description: Lista de camiones con metadatos de paginación
 *   post:
 *     tags: [Camión]
 *     summary: Registrar un camión
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [Placa]
 *             properties:
 *               Placa: { type: string, example: "ABC-123" }
 *               nombre: { type: string }
 *               ano_fabricacion: { type: integer }
 *               modelo: { type: string }
 *               color: { type: string }
 *               caracteristicas: { type: string }
 *               revision_tecnica: { type: string }
 *               fecha_prox_revision: { type: string, format: date }
 *               ID_Fabricante: { type: integer }
 *               tarjeta_propiedad: { type: string }
 *               vencimiento_tarjeta: { type: string, format: date }
 *               soat_n_poliza: { type: string }
 *               soat_empresa: { type: string }
 *               soat_precio: { type: number }
 *               soat_dia_pago: { type: string, format: date }
 *     responses:
 *       201:
 *         description: Camión creado
 */
router.get('/', c.getAll);
router.post('/', c.create);

/**
 * @openapi
 * /api/camiones/{placa}:
 *   get:
 *     tags: [Camión]
 *     summary: Obtener camión por Placa
 *     parameters:
 *       - in: path
 *         name: placa
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Camión encontrado
 *       404:
 *         description: No encontrado
 *   put:
 *     tags: [Camión]
 *     summary: Actualizar camión
 *     parameters:
 *       - in: path
 *         name: placa
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nombre: { type: string }
 *               modelo: { type: string }
 *               color: { type: string }
 *               soat_n_poliza: { type: string }
 *               soat_empresa: { type: string }
 *               soat_precio: { type: number }
 *               soat_dia_pago: { type: string, format: date }
 *     responses:
 *       200:
 *         description: Camión actualizado
 *   delete:
 *     tags: [Camión]
 *     summary: Eliminar camión
 *     parameters:
 *       - in: path
 *         name: placa
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Camión eliminado
 */
router.get('/:placa', c.getByPlaca);
router.put('/:placa', c.update);
router.delete('/:placa', c.remove);

/**
 * @openapi
 * /api/camiones/{placa}/mantenimientos:
 *   get:
 *     tags: [Camión - Mantenimiento]
 *     summary: Listar mantenimientos del camión
 *     parameters:
 *       - in: path
 *         name: placa
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Lista de mantenimientos
 *   post:
 *     tags: [Camión - Mantenimiento]
 *     summary: Registrar mantenimiento del camión
 *     parameters:
 *       - in: path
 *         name: placa
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fecha_ultimo_mant: { type: string, format: date }
 *               responsable: { type: string }
 *               razon: { type: string }
 *               contacto_responsable: { type: string }
 *               pdf_mantenimiento: { type: string }
 *     responses:
 *       201:
 *         description: Mantenimiento registrado
 */
router.get('/:placa/mantenimientos', c.getMantenimientos);
router.post('/:placa/mantenimientos', c.createMantenimiento);

/**
 * @openapi
 * /api/camiones/{placa}/mantenimientos/{mid}:
 *   delete:
 *     tags: [Camión - Mantenimiento]
 *     summary: Eliminar mantenimiento
 *     parameters:
 *       - in: path
 *         name: placa
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: mid
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Eliminado
 */
router.delete('/:placa/mantenimientos/:mid', c.deleteMantenimiento);

/**
 * @openapi
 * /api/camiones/{placa}/inventario:
 *   get:
 *     tags: [Camión - Inventario]
 *     summary: Listar inventario del camión
 *     parameters:
 *       - in: path
 *         name: placa
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Lista de ítems de inventario
 *   post:
 *     tags: [Camión - Inventario]
 *     summary: Asignar objeto de inventario al camión
 *     parameters:
 *       - in: path
 *         name: placa
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [Id_Objeto]
 *             properties:
 *               Id_Objeto: { type: integer }
 *               cantidad_requerida: { type: integer }
 *               cantidad_actual: { type: integer }
 *               ubicacion_en_camion: { type: string }
 *               requerido_legal: { type: string, enum: [si, no] }
 *     responses:
 *       201:
 *         description: Ítem asignado
 */
router.get('/:placa/inventario', c.getCamionInventario);
router.post('/:placa/inventario', c.createCamionInventario);

/**
 * @openapi
 * /api/camiones/{placa}/inventario/{iid}:
 *   delete:
 *     tags: [Camión - Inventario]
 *     summary: Desasignar objeto del camión
 *     parameters:
 *       - in: path
 *         name: placa
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: iid
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Eliminado
 */
router.delete('/:placa/inventario/:iid', c.deleteCamionInventario);

module.exports = router;
