const router = require('express').Router();
const c = require('../controllers/inventario.controller');

/**
 * @openapi
 * tags:
 *   - name: Inventario
 *     description: Gestión de inventario / equipos
 *   - name: Inventario - Usos
 *     description: Usos registrados por objeto
 */

/**
 * @openapi
 * /api/inventario:
 *   get:
 *     tags: [Inventario]
 *     summary: Listar todos los ítems de inventario
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
 *         description: Lista de inventario con metadatos de paginación
 *   post:
 *     tags: [Inventario]
 *     summary: Crear un objeto en el inventario
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [nombre_objeto]
 *             properties:
 *               nombre_objeto: { type: string, example: "Extintor CO2" }
 *               lugar_almacenaje: { type: string }
 *               cantidad: { type: integer, example: 5 }
 *               ID_Fabricante: { type: integer }
 *               orden_compra: { type: string }
 *               fecha_compra: { type: string, format: date }
 *               garantia: { type: string }
 *               numero_serial: { type: string }
 *               ano_fabricacion: { type: integer }
 *               peso: { type: number }
 *               estado: { type: string, enum: [disponible, "en mantenimiento", malogrado, "en trabajo"] }
 *               precio_compra: { type: number }
 *               precio_envio: { type: number }
 *               responsable_envio: { type: string }
 *               precio_comercial: { type: number }
 *               mant_requerimiento: { type: string, enum: [si, no] }
 *               mant_ultimo: { type: string, format: date }
 *               mant_fecha_caducidad: { type: string, format: date }
 *               mant_responsable: { type: string }
 *               mant_contacto: { type: string }
 *     responses:
 *       201:
 *         description: Objeto creado
 */
router.get('/', c.getAll);
router.post('/', c.create);

/**
 * @openapi
 * /api/inventario/{id}:
 *   get:
 *     tags: [Inventario]
 *     summary: Obtener objeto por ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Objeto encontrado
 *       404:
 *         description: No encontrado
 *   put:
 *     tags: [Inventario]
 *     summary: Actualizar objeto del inventario
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
 *               nombre_objeto: { type: string }
 *               cantidad: { type: integer }
 *               estado: { type: string, enum: [disponible, "en mantenimiento", malogrado, "en trabajo"] }
 *     responses:
 *       200:
 *         description: Actualizado
 *   delete:
 *     tags: [Inventario]
 *     summary: Eliminar objeto del inventario
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
 * /api/inventario/{id}/usos:
 *   get:
 *     tags: [Inventario - Usos]
 *     summary: Listar usos del objeto
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Lista de usos
 *   post:
 *     tags: [Inventario - Usos]
 *     summary: Agregar uso al objeto
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
 *             required: [uso]
 *             properties:
 *               uso: { type: string, enum: [venta, alquiler, "uso en proyectos"] }
 *     responses:
 *       201:
 *         description: Uso creado
 */
router.get('/:id/usos', c.getUsos);
router.post('/:id/usos', c.createUso);

/**
 * @openapi
 * /api/inventario/{id}/usos/{uid}:
 *   delete:
 *     tags: [Inventario - Usos]
 *     summary: Eliminar uso del objeto
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *       - in: path
 *         name: uid
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Uso eliminado
 */
router.delete('/:id/usos/:uid', c.deleteUso);

module.exports = router;
