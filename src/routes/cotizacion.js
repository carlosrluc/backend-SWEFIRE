const router = require('express').Router();
const c = require('../controllers/cotizacion.controller');
const auth = require('../middlewares/auth.middleware');
const { permit } = require('../middlewares/role.middleware');

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
 *     summary: Listar todas las cotizaciones comerciales
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
 *         description: Lista de cotizaciones con metadatos de paginación
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
 *               fecha_emision: { type: string, format: date }
 *               fecha_vigencia: { type: string, format: date }
 *               observacion: { type: string }
 *               Tasa_Cambio: { type: number }
 *               condiciones: { type: string }
 *               tacaCompra: { type: number }
 *               tasaVenta: { type: number }
 *     responses:
 *       201:
 *         description: Cotización creada
 */
router.get('/', auth, permit(['cliente', 'abogado', 'trabajtaller', 'gerente', 'adminproy']), c.getAll);
router.post('/', auth, permit(['abogado', 'trabajtaller', 'gerente', 'adminproy']), c.create);

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
 *               fecha_emision: { type: string, format: date }
 *               fecha_vigencia: { type: string, format: date }
 *               observacion: { type: string }
 *               Tasa_Cambio: { type: number }
 *               condiciones: { type: string }
 *               tacaCompra: { type: number }
 *               tasaVenta: { type: number }
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
router.get('/:id', auth, permit(['cliente', 'abogado', 'trabajtaller', 'gerente', 'adminproy']), c.getById);
router.put('/:id', auth, permit(['cliente', 'trabajtaller', 'gerente', 'adminproy']), c.update);
router.delete('/:id', auth, permit(['gerente', 'adminproy']), c.remove);

/**
 * @openapi
 * /api/cotizaciones/{id}/detalles:
 *   get:
 *     tags: [Cotización]
 *     summary: Obtener detalles específicos y completos de una cotización
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Información detallada de la cotización encontrada (inventario, camiones, servicios y base)
 *       404:
 *         description: No encontrada o sin permiso
 */
router.get('/:id/detalles', auth, permit(['cliente', 'abogado', 'trabajtaller', 'gerente', 'adminproy']), c.getDetalles);

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
 *               ubicacion: { type: string }
 *     responses:
 *       201:
 *         description: Servicio agregado
 */
router.get('/:id/servicios', auth, permit(['cliente', 'abogado', 'trabajtaller', 'gerente', 'adminproy']), c.getServicios);
router.post('/:id/servicios', auth, permit(['abogado', 'trabajtaller', 'gerente', 'adminproy']), c.createServicio);

/**
 * @openapi
 * /api/cotizaciones/{id}/servicios/{sid}:
 *   put:
 *     tags: [Cotización - Servicios]
 *     summary: Actualizar servicio de la cotización
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
 *               fecha_inicio: { type: string, format: date }
 *               fecha_finalizacion: { type: string, format: date }
 *               jornada: { type: string }
 *               precio_comercial: { type: number }
 *               ubicacion: { type: string }
 *     responses:
 *       200:
 *         description: Servicio actualizado
 */
router.put('/:id/servicios/:sid', auth, permit(['trabajtaller', 'gerente', 'adminproy']), c.updateServicio);

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
router.delete('/:id/servicios/:sid', auth, permit(['gerente', 'adminproy']), c.deleteServicio);

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
 *               preciounit: { type: number }
 *     responses:
 *       201:
 *         description: Camión asignado
 */
router.get('/:id/camiones', auth, permit(['cliente', 'abogado', 'trabajtaller', 'gerente', 'adminproy']), c.getCamiones);
router.post('/:id/camiones', auth, permit(['abogado', 'trabajtaller', 'gerente', 'adminproy']), c.createCamion);

/**
 * @openapi
 * /api/cotizaciones/{id}/camiones/{cid}:
 *   put:
 *     tags: [Cotización - Camiones]
 *     summary: Actualizar camión asignado
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
 *               Placa: { type: string }
 *               uso: { type: string }
 *               fecha_hora_entrada: { type: string, format: date-time }
 *               fecha_hora_salida: { type: string, format: date-time }
 *               ID_Piloto: { type: integer }
 *               preciounit: { type: number }
 *     responses:
 *       200:
 *         description: Camión actualizado
 */
router.put('/:id/camiones/:cid', auth, permit(['trabajtaller', 'gerente', 'adminproy']), c.updateCamion);

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
router.delete('/:id/camiones/:cid', auth, permit(['gerente', 'adminproy']), c.deleteCamion);

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
 *               costo_comercial: { type: number }
 *               fecha_salida_taller: { type: string, format: date-time }
 *               fecha_ingreso_taller: { type: string, format: date-time }
 *               observaciones: { type: string }
 *     responses:
 *       201:
 *         description: Inventario agregado
 */
router.get('/:id/inventario', auth, permit(['cliente', 'abogado', 'trabajtaller', 'gerente', 'adminproy']), c.getInventario);
router.post('/:id/inventario', auth, permit(['abogado', 'trabajtaller', 'gerente', 'adminproy']), c.createInventario);

/**
 * @openapi
 * /api/cotizaciones/{id}/inventario/{iid}:
 *   put:
 *     tags: [Cotización - Inventario]
 *     summary: Actualizar inventario de la cotización
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
 *               precio_comercial: { type: number }
 *               costo_comercial: { type: number }
 *               fecha_salida_taller: { type: string, format: date-time }
 *               fecha_ingreso_taller: { type: string, format: date-time }
 *               observaciones: { type: string }
 *     responses:
 *       200:
 *         description: Inventario actualizado
 */
router.put('/:id/inventario/:iid', auth, permit(['trabajtaller', 'gerente', 'adminproy']), c.updateInventario);

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
router.delete('/:id/inventario/:iid', auth, permit(['gerente', 'adminproy']), c.deleteInventario);

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
router.get('/:id/personal', auth, permit(['cliente', 'abogado', 'trabajtaller', 'gerente', 'adminproy']), c.getPersonal);
router.post('/:id/personal', auth, permit(['abogado', 'trabajtaller', 'gerente', 'adminproy']), c.createPersonal);

/**
 * @openapi
 * /api/cotizaciones/{id}/personal/{pid}:
 *   put:
 *     tags: [Cotización - Personal]
 *     summary: Actualizar personal asignado
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *       - in: path
 *         name: pid
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               ID_Usuario: { type: integer }
 *               rol_en_trabajo: { type: string }
 *               fecha_entrada: { type: string, format: date }
 *               fecha_salida: { type: string, format: date }
 *               dias_trabajados: { type: integer }
 *     responses:
 *       200:
 *         description: Personal actualizado
 */
router.put('/:id/personal/:pid', auth, permit(['trabajtaller', 'gerente', 'adminproy']), c.updatePersonal);

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
router.delete('/:id/personal/:pid', auth, permit(['gerente', 'adminproy']), c.deletePersonal);

module.exports = router;
