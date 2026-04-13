const router = require('express').Router();
const c = require('../controllers/solicitud.controller');

/**
 * @openapi
 * tags:
 *   - name: Solicitud
 *     description: Gestión de solicitudes de clientes
 *   - name: Solicitud - Medios de Comunicación
 *     description: Canales de comunicación de la solicitud
 *   - name: Solicitud - Servicios
 *     description: Servicios solicitados
 *   - name: Solicitud - Inventario
 *     description: Inventario solicitado
 */

/**
 * @openapi
 * /api/solicitudes:
 *   get:
 *     tags: [Solicitud]
 *     summary: Listar todas las solicitudes
 *     responses:
 *       200:
 *         description: Lista de solicitudes
 *   post:
 *     tags: [Solicitud]
 *     summary: Crear una solicitud
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [Id_Cliente]
 *             properties:
 *               Id_Cliente: { type: string, example: "20512345678" }
 *               descripcion: { type: string }
 *               ubicacion: { type: string }
 *     responses:
 *       201:
 *         description: Solicitud creada
 */
router.get('/', c.getAll);
router.post('/', c.create);

/**
 * @openapi
 * /api/solicitudes/{id}:
 *   get:
 *     tags: [Solicitud]
 *     summary: Obtener solicitud por ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Solicitud encontrada
 *       404:
 *         description: No encontrada
 *   put:
 *     tags: [Solicitud]
 *     summary: Actualizar solicitud
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
 *               Id_Cliente: { type: string }
 *               descripcion: { type: string }
 *               ubicacion: { type: string }
 *     responses:
 *       200:
 *         description: Actualizada
 *   delete:
 *     tags: [Solicitud]
 *     summary: Eliminar solicitud
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
 * /api/solicitudes/{id}/medios:
 *   get:
 *     tags: [Solicitud - Medios de Comunicación]
 *     summary: Listar medios de comunicación de la solicitud
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Lista de medios
 *   post:
 *     tags: [Solicitud - Medios de Comunicación]
 *     summary: Agregar medio de comunicación
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
 *               cliente_email: { type: string }
 *               cliente_telefono: { type: string }
 *     responses:
 *       201:
 *         description: Medio creado
 */
router.get('/:id/medios', c.getMedios);
router.post('/:id/medios', c.createMedio);

/**
 * @openapi
 * /api/solicitudes/{id}/medios/{mid}:
 *   delete:
 *     tags: [Solicitud - Medios de Comunicación]
 *     summary: Eliminar medio de comunicación
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *       - in: path
 *         name: mid
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Eliminado
 */
router.delete('/:id/medios/:mid', c.deleteMedio);

/**
 * @openapi
 * /api/solicitudes/{id}/servicios:
 *   get:
 *     tags: [Solicitud - Servicios]
 *     summary: Listar servicios de la solicitud
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Lista de servicios
 *   post:
 *     tags: [Solicitud - Servicios]
 *     summary: Agregar servicio a la solicitud
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
 *               fecha_servicio: { type: string, format: date }
 *               horario_servicio: { type: string }
 *     responses:
 *       201:
 *         description: Servicio agregado
 */
router.get('/:id/servicios', c.getServicios);
router.post('/:id/servicios', c.createServicio);

/**
 * @openapi
 * /api/solicitudes/{id}/servicios/{sid}:
 *   delete:
 *     tags: [Solicitud - Servicios]
 *     summary: Eliminar servicio de la solicitud
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
 * /api/solicitudes/{id}/inventario:
 *   get:
 *     tags: [Solicitud - Inventario]
 *     summary: Listar inventario de la solicitud
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Lista de inventario
 *   post:
 *     tags: [Solicitud - Inventario]
 *     summary: Agregar inventario a la solicitud
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
 *     responses:
 *       201:
 *         description: Inventario agregado
 */
router.get('/:id/inventario', c.getInventario);
router.post('/:id/inventario', c.createInventario);

/**
 * @openapi
 * /api/solicitudes/{id}/inventario/{iid}:
 *   delete:
 *     tags: [Solicitud - Inventario]
 *     summary: Eliminar inventario de la solicitud
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

module.exports = router;
