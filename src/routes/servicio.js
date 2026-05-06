const router = require('express').Router();
const c = require('../controllers/servicio.controller');

/**
 * @openapi
 * tags:
 *   - name: Servicio
 *     description: Gestión de servicios ofrecidos
 *   - name: Servicio - Personal Requerido
 *     description: Personal requerido por cada servicio
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
 *     responses:
 *       201:
 *         description: Servicio creado
 */
router.get('/', c.getAll);
router.post('/', c.create);

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
router.delete('/:id/personal/:pid', c.deletePersonal);

module.exports = router;
