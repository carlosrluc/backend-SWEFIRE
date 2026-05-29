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
 *   - name: Solicitud - Camiones
 *     description: Camiones solicitados (alquiler por días)
 */

/**
 * @openapi
 * /api/solicitudes:
 *   get:
 *     tags: [Solicitud]
 *     summary: Listar todas las solicitudes
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
 *         description: Lista de solicitudes con metadatos de paginación
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
 *               productoenvio: { type: string }
 *               camionesenvio: { type: string }
 *               obsgenerales: { type: string }
 *               obseleccion: { type: string }
 *               estado: { type: string, enum: ['pendiente','aceptado','rechazado'] }
 *               Respuesta: { type: string }
 *               FechaCreacion: { type: string, format: date }
 *     responses:
 *       201:
 *         description: Solicitud creada
 */
router.get('/', c.getAll);
router.post('/', c.create);

/**
 * @openapi
 * /api/solicitudes/estado/{estado}:
 *   get:
 *     tags: [Solicitud]
 *     summary: Listar solicitudes por estado
 *     parameters:
 *       - in: path
 *         name: estado
 *         required: true
 *         schema: { type: string, enum: ['pendiente','aceptado','rechazado'] }
 *         description: Estado de la solicitud
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
 *         description: Lista de solicitudes filtrada por estado
 */
router.get('/estado/:estado', c.getByEstado);

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
 *               productoenvio: { type: string }
 *               camionesenvio: { type: string }
 *               obsgenerales: { type: string }
 *               obseleccion: { type: string }
 *               estado: { type: string, enum: ['pendiente','aceptado','rechazado'] }
 *               Respuesta: { type: string }
 *               FechaCreacion: { type: string, format: date }
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
 *   put:
 *     tags: [Solicitud - Medios de Comunicación]
 *     summary: Actualizar medio de comunicación
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *       - in: path
 *         name: mid
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
 *       200:
 *         description: Medio actualizado
 */
router.put('/:id/medios/:mid', c.updateMedio);

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
 *     summary: Agregar uno o varios servicios a la solicitud
 *     description: "Acepta un objeto, un arreglo de servicios, o un body con clave servicios"
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
 *             oneOf:
 *               - type: object
 *                 required: [ID_Servicio]
 *                 properties:
 *                   ID_Servicio: { type: integer }
 *                   fecha_inicio_servicio: { type: string, format: date }
 *                   fecha_fin_servicio: { type: string, format: date }
 *                   horario_servicio: { type: string }
 *               - type: array
 *                 items:
 *                   type: object
 *                   required: [ID_Servicio]
 *                   properties:
 *                     ID_Servicio: { type: integer }
 *                     fecha_inicio_servicio: { type: string, format: date }
 *                     fecha_fin_servicio: { type: string, format: date }
 *                     horario_servicio: { type: string }
 *     responses:
 *       201:
 *         description: Servicio(s) agregado(s)
 */
router.get('/:id/servicios', c.getServicios);
router.post('/:id/servicios', c.createServicio);

/**
 * @openapi
 * /api/solicitudes/{id}/servicios/{sid}:
 *   put:
 *     tags: [Solicitud - Servicios]
 *     summary: Actualizar servicio de la solicitud
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *       - in: path
 *         name: sid
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               ID_Servicio: { type: integer }
 *               fecha_inicio_servicio: { type: string, format: date }
 *               fecha_fin_servicio: { type: string, format: date }
 *               horario_servicio: { type: string }
 *     responses:
 *       200:
 *         description: Servicio actualizado
 */
router.put('/:id/servicios/:sid', c.updateServicio);

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
 *   put:
 *     tags: [Solicitud - Inventario]
 *     summary: Actualizar inventario de la solicitud
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *       - in: path
 *         name: iid
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               ID_Inventario: { type: integer }
 *               cantidad: { type: integer }
 *               intencion: { type: string, enum: [comprar, alquilar] }
 *               dias_alquilados: { type: integer }
 *     responses:
 *       200:
 *         description: Inventario actualizado
 */
router.put('/:id/inventario/:iid', c.updateInventario);

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

/**
 * @openapi
 * /api/solicitudes/{id}/camiones:
 *   get:
 *     tags: [Solicitud - Camiones]
 *     summary: Listar camiones de la solicitud
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Lista de camiones solicitados
 *   post:
 *     tags: [Solicitud - Camiones]
 *     summary: Agregar uno o varios camiones a la solicitud (alquiler por días)
 *     description: "Acepta un objeto, un arreglo, o un body con clave camiones. id_camion es la placa del camión."
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
 *             oneOf:
 *               - type: object
 *                 required: [id_camion, numero_dias]
 *                 properties:
 *                   id_camion: { type: string, description: "Placa del camión" }
 *                   numero_dias: { type: integer }
 *               - type: array
 *                 items:
 *                   type: object
 *                   required: [id_camion, numero_dias]
 *                   properties:
 *                     id_camion: { type: string }
 *                     numero_dias: { type: integer }
 *     responses:
 *       201:
 *         description: Camión(es) agregado(s)
 */
router.get('/:id/camiones', c.getCamiones);
router.post('/:id/camiones', c.createCamion);

/**
 * @openapi
 * /api/solicitudes/{id}/camiones/{cid}:
 *   put:
 *     tags: [Solicitud - Camiones]
 *     summary: Actualizar camión de la solicitud
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *       - in: path
 *         name: cid
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               id_camion: { type: string }
 *               numero_dias: { type: integer }
 *     responses:
 *       200:
 *         description: Actualizado
 *   delete:
 *     tags: [Solicitud - Camiones]
 *     summary: Eliminar camión de la solicitud
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
router.put('/:id/camiones/:cid', c.updateCamion);
router.delete('/:id/camiones/:cid', c.deleteCamion);

module.exports = router;
