const router = require('express').Router();
const c = require('../controllers/solicitud.controller');

/**
 * @openapi
 * components:
 *   schemas:
 *     SolicitudUbicacionEtapa:
 *       type: object
 *       properties:
 *         id: { type: integer, example: 2 }
 *         nombre: { type: string, example: "fase de instalacion" }
 *         orden: { type: integer, example: 2 }
 *     SolicitudServicioInput:
 *       type: object
 *       required: [ID_Servicio]
 *       properties:
 *         ID_Servicio: { type: integer, example: 1 }
 *         Principal: { type: boolean, example: true, description: "true = servicio principal; false = secundario/subservicio" }
 *         id_subservicio: { type: integer, nullable: true, example: 2, description: "ID de SERVICIO_SUBSERVICIO (de GET /servicios/{id}/principal). Requerido si el secundario viene del catálogo de subservicios." }
 *         ubicacion_etapa:
 *           $ref: '#/components/schemas/SolicitudUbicacionEtapa'
 *         indicaciones: { type: string, nullable: true, example: "Coordinar acceso 48h antes" }
 *         fecha_inicio_servicio: { type: string, format: date, example: "2026-06-10" }
 *         fecha_fin_servicio: { type: string, format: date, example: "2026-06-20" }
 *         horario_servicio: { type: string, example: "08:00 - 17:00" }
 *     SolicitudServicioResponse:
 *       allOf:
 *         - $ref: '#/components/schemas/SolicitudServicioInput'
 *         - type: object
 *           properties:
 *             id: { type: integer, example: 42 }
 *             ID_Solicitud: { type: integer, example: 115 }
 *             nombre: { type: string, example: "Instalación de Sistema de Rociadores (Sprinklers)" }
 *     SolicitudCreateConServicios:
 *       type: object
 *       description: |
 *         Crear solicitud con servicios en un solo paso.
 *         Acepta `servicios[]` o el formato devuelto por GET /servicios/{id}/principal
 *         (`servicio_principal` + `servicios_secundarios`).
 *       required: [Id_Cliente]
 *       properties:
 *         Id_Cliente: { type: string, example: "20501234567" }
 *         descripcion: { type: string, example: "Instalación de rociadores zona expansión" }
 *         ubicacion: { type: string, example: "Av. Javier Prado Este 4200, San Borja" }
 *         productoenvio: { type: string }
 *         camionesenvio: { type: string }
 *         obsgenerales: { type: string }
 *         obseleccion: { type: string }
 *         Respuesta: { type: string }
 *         servicios:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/SolicitudServicioInput'
 *         servicio_principal:
 *           $ref: '#/components/schemas/SolicitudServicioInput'
 *         servicios_secundarios:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/SolicitudServicioInput'
 *       example:
 *         Id_Cliente: "20501234567"
 *         descripcion: "Instalación de rociadores"
 *         ubicacion: "San Borja, Lima"
 *         servicio_principal:
 *           ID_Servicio: 1
 *           Principal: true
 *           indicaciones: "Servicio principal del proyecto"
 *           fecha_inicio_servicio: "2026-06-10"
 *           horario_servicio: "08:00 - 17:00"
 *         servicios_secundarios:
 *           - ID_Servicio: 8
 *             Principal: false
 *             id_subservicio: 1
 *             ubicacion_etapa: { id: 1, nombre: "fase de envio de productos", orden: 1 }
 *             indicaciones: "Grupo electrógeno recomendado"
 *           - ID_Servicio: 2
 *             Principal: false
 *             id_subservicio: 2
 *             ubicacion_etapa: { id: 2, nombre: "fase de instalacion", orden: 2 }
 *     SolicitudActividadFlujo:
 *       type: object
 *       properties:
 *         id: { type: integer, example: 5 }
 *         nombre: { type: string, example: "empacar todo lo requerido en el camion de envio" }
 *         origen: { type: string, enum: [servicio, subservicio], example: "servicio" }
 *         ID_Servicio_Hijo: { type: integer, nullable: true, description: "Presente si origen=subservicio" }
 *     SolicitudEtapaFlujo:
 *       type: object
 *       properties:
 *         id: { type: integer, example: 1 }
 *         nombre: { type: string, example: "fase de envio de productos" }
 *         descripcion: { type: string, nullable: true }
 *         duracion: { type: integer, nullable: true }
 *         orden: { type: integer, example: 1 }
 *         actividades:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/SolicitudActividadFlujo'
 *     SolicitudDetalleResponse:
 *       type: object
 *       description: Solicitud con relaciones y preview del flujo según servicio principal y subservicios elegidos
 *       properties:
 *         etapas:
 *           type: array
 *           nullable: true
 *           description: "Etapas del servicio principal con actividades filtradas. null si no hay principal."
 *           items:
 *             $ref: '#/components/schemas/SolicitudEtapaFlujo'
 *         servicio_principal:
 *           allOf:
 *             - $ref: '#/components/schemas/SolicitudServicioResponse'
 *             - type: object
 *               properties:
 *                 etapas:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/SolicitudEtapaFlujo'
 *           nullable: true
 *         servicios_secundarios:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/SolicitudServicioResponse'
 *         servicios:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/SolicitudServicioResponse'
 */

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
 *     summary: Crear una solicitud (opcionalmente con servicios principal y secundarios)
 *     description: |
 *       Puede crear solo la cabecera de la solicitud, o incluir servicios en el mismo POST.
 *       Los servicios pueden enviarse como `servicios[]` o como `servicio_principal` + `servicios_secundarios`
 *       (formato alineado con GET /api/servicios/{id}/principal).
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SolicitudCreateConServicios'
 *     responses:
 *       201:
 *         description: Solicitud creada (incluye `servicios` si se enviaron)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string, example: "Solicitud creada" }
 *                 ID: { type: integer, example: 115 }
 *                 servicios:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/SolicitudServicioResponse'
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
 *         description: Solicitud encontrada (incluye etapas/actividades del flujo según servicios elegidos)
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - type: object
 *                 - $ref: '#/components/schemas/SolicitudDetalleResponse'
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
 *         description: Lista de servicios con Principal, id_subservicio y ubicacion_etapa
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/SolicitudServicioResponse'
 *   post:
 *     tags: [Solicitud - Servicios]
 *     summary: Agregar uno o varios servicios a la solicitud
 *     description: |
 *       Acepta:
 *       - Un objeto o arreglo en `servicios`
 *       - Formato de GET /api/servicios/{id}/principal (`servicio_principal` + `servicios_secundarios`)
 *
 *       Campos clave por servicio:
 *       - `Principal` (boolean): un solo `true` por solicitud
 *       - `id_subservicio`: ID de SERVICIO_SUBSERVICIO para secundarios del catálogo
 *       - `ubicacion_etapa`: etapa donde ocurre el subservicio (validación; viene del GET principal)
 *       - `indicaciones`: notas del cliente para ese servicio
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
 *               - $ref: '#/components/schemas/SolicitudServicioInput'
 *               - type: array
 *                 items:
 *                   $ref: '#/components/schemas/SolicitudServicioInput'
 *               - type: object
 *                 properties:
 *                   servicios:
 *                     type: array
 *                     items:
 *                       $ref: '#/components/schemas/SolicitudServicioInput'
 *               - type: object
 *                 properties:
 *                   servicio_principal:
 *                     $ref: '#/components/schemas/SolicitudServicioInput'
 *                   servicios_secundarios:
 *                     type: array
 *                     items:
 *                       $ref: '#/components/schemas/SolicitudServicioInput'
 *           examples:
 *             desdeGetPrincipal:
 *               summary: Formato alineado con GET /servicios/1/principal
 *               value:
 *                 servicio_principal:
 *                   ID_Servicio: 1
 *                   Principal: true
 *                   fecha_inicio_servicio: "2026-06-10"
 *                   horario_servicio: "08:00 - 17:00"
 *                   indicaciones: "Servicio principal"
 *                 servicios_secundarios:
 *                   - ID_Servicio: 8
 *                     Principal: false
 *                     id_subservicio: 1
 *                     ubicacion_etapa: { id: 1, nombre: "fase de envio de productos", orden: 1 }
 *                   - ID_Servicio: 2
 *                     Principal: false
 *                     id_subservicio: 2
 *                     ubicacion_etapa: { id: 2, nombre: "fase de instalacion", orden: 2 }
 *             arregloSimple:
 *               summary: Arreglo de servicios
 *               value:
 *                 - ID_Servicio: 1
 *                   Principal: true
 *                   indicaciones: "Principal"
 *                 - ID_Servicio: 9
 *                   Principal: false
 *                   id_subservicio: 4
 *                   ubicacion_etapa: { id: 4, nombre: "Inicio y material", orden: 1 }
 *     responses:
 *       201:
 *         description: Servicio(s) agregado(s)
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - $ref: '#/components/schemas/SolicitudServicioResponse'
 *                 - type: object
 *                   properties:
 *                     message: { type: string }
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/SolicitudServicioResponse'
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
 *               indicaciones: { type: string, nullable: true }
 *               id_subservicio: { type: integer, nullable: true, description: "No modificable vía PUT de subservicio una vez creado" }
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
