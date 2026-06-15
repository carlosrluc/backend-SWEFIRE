const router = require('express').Router();
const c = require('../controllers/cotizacion.controller');
const auth = require('../middlewares/auth.middleware');
const { permit } = require('../middlewares/role.middleware');
const { uploadCotizacion, requireFile } = require('../middlewares/upload.middleware');

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
 * components:
 *   schemas:
 *     UpsertQuotationInventoryItem:
 *       type: object
 *       required: [id, cantidad, precio_unitario, intencion]
 *       properties:
 *         id: { type: string, description: ID_Inventario }
 *         nombre: { type: string }
 *         cantidad: { type: number }
 *         precio_unitario: { type: number }
 *         intencion: { type: string, enum: [comprar, alquilar] }
 *         dias_alquilados: { type: number, nullable: true }
 *     UpsertQuotationServiceItem:
 *       type: object
 *       required: [id, startDate, dueDate, unitPrice]
 *       properties:
 *         id: { type: string, description: ID_Servicio }
 *         idCotizacionServicio: { type: integer, description: 'ID en COTIZACION_SERVICIO (solo en respuestas GET)' }
 *         name: { type: string }
 *         startDate: { type: string, format: date }
 *         dueDate: { type: string, format: date }
 *         schedule: { type: string, description: jornada / horario }
 *         unitPrice: { type: number }
 *         Principal: { type: boolean }
 *         pago_por_dia: { type: boolean, description: 'Heredado de SERVICIO; si true precio × días' }
 *         dias: { type: integer, description: 'Días del servicio según etapas (solo respuesta)' }
 *         precio_linea: { type: number, description: 'precio_comercial o precio_comercial × dias (solo respuesta)' }
 *         indicaciones: { type: string, nullable: true }
 *         id_servicio_subservicio: { type: integer, nullable: true, description: 'ID de SERVICIO_SUBSERVICIO si el secundario viene del catálogo' }
 *     CotizacionServicioLegacy:
 *       type: object
 *       properties:
 *         idCotizacionServicio: { type: integer, example: 120 }
 *         idServicio: { type: integer, example: 1 }
 *         nombre: { type: string, example: "Instalación de Sistema de Rociadores (Sprinklers)" }
 *         fecha_inicio: { type: string, format: date, example: "2026-06-10" }
 *         fecha_finalizacion: { type: string, format: date, example: "2026-06-20" }
 *         jornada: { type: string, example: "08:00 - 17:00" }
 *         precio_comercial: { type: number, example: 15000 }
 *         Principal: { type: boolean, example: true }
 *         indicaciones: { type: string, nullable: true, example: "Servicio principal con flujo de 3 etapas." }
 *         id_servicio_subservicio: { type: integer, nullable: true, example: 2 }
 *     CotizacionDetalleFrancoResponse:
 *       type: object
 *       description: Respuesta de GET /detalles-franco (UpsertQuotationDTO + campos legacy)
 *       properties:
 *         id: { type: integer, example: 45 }
 *         id_solicitud: { type: integer, example: 1 }
 *         name: { type: string }
 *         inventory: { type: array, items: { $ref: '#/components/schemas/UpsertQuotationInventoryItem' } }
 *         services:
 *           type: array
 *           items: { $ref: '#/components/schemas/UpsertQuotationServiceItem' }
 *         phases:
 *           type: object
 *           properties:
 *             items:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id: { type: string, example: "srv-etapa-1" }
 *                   id_bd: { type: integer }
 *                   name: { type: string, example: "fase de envio de productos" }
 *                   description: { type: string }
 *                   duration: { type: number }
 *                   activities:
 *                     type: array
 *                     items:
 *                       type: object
 *                       properties:
 *                         id: { type: string, example: "srv-act-1" }
 *                         id_bd: { type: integer }
 *                         name: { type: string }
 *         servicios:
 *           type: array
 *           items: { $ref: '#/components/schemas/CotizacionServicioLegacy' }
 *         servicio_principal:
 *           $ref: '#/components/schemas/CotizacionServicioLegacy'
 *           nullable: true
 *         servicios_secundarios:
 *           type: array
 *           items: { $ref: '#/components/schemas/CotizacionServicioLegacy' }
 *         etapas: { type: integer, nullable: true, description: 'Cantidad de etapas (resumen)' }
 *         duracion_etapa: { type: string, nullable: true, description: 'Duración total en días (resumen)' }
 *     UpsertQuotationTruckItem:
 *       type: object
 *       required: [plate]
 *       properties:
 *         plate: { type: string }
 *         model: { type: string }
 *         color: { type: string }
 *         maintenanceDate: { type: string, format: date }
 *         description: { type: string }
 *         uso: { type: integer, description: 'id de COTIZACION_SERVICIO (solo tras crear la cotización)' }
 *         serviceIndex: { type: integer, description: 'Índice en services[] del mismo POST (recomendado al crear)' }
 *         ID_Servicio: { type: integer, description: 'ID del catálogo SERVICIO (alternativa a serviceIndex)' }
 *         id_servicio_subservicio: { type: integer, description: 'Desambigua si hay varios servicios con el mismo ID_Servicio' }
 *         unitPrice: { type: number, description: 'Legacy — PrecioUnit' }
 *     UpsertQuotationDTO:
 *       type: object
 *       required: [name, id_solicitud]
 *       properties:
 *         name: { type: string }
 *         id_solicitud: { type: integer, description: 'Requerido al crear. Importa servicios, productos y flujo desde la solicitud.' }
 *         fecha_inicio_proyecto: { type: string, format: date, example: "2026-06-16", description: 'Inicio del proyecto; calcula fechas de servicios según duración de etapas' }
 *         DNI_O_RUC: { type: string, description: 'Opcional si viene de la solicitud' }
 *         inventory:
 *           type: array
 *           items: { $ref: '#/components/schemas/UpsertQuotationInventoryItem' }
 *         services:
 *           type: array
 *           items: { $ref: '#/components/schemas/UpsertQuotationServiceItem' }
 *         trucks:
 *           type: array
 *           items: { $ref: '#/components/schemas/UpsertQuotationTruckItem' }
 *         pickupService:
 *           type: object
 *           properties:
 *             pickupCost: { type: number }
 *             pickupDate: { type: string, format: date }
 *             pickupAddress: { type: string }
 *         quotationConditions:
 *           type: object
 *           properties:
 *             emissionDate: { type: string, format: date }
 *             expirationDate: { type: string, format: date }
 *             conditions: { type: string }
 *             observations: { type: string }
 *         quotationRate:
 *           type: object
 *           properties:
 *             sellingRate: { type: number }
 *             buyingRate: { type: number }
 *         phases:
 *           type: object
 *           description: |
 *             Etapas/actividades de la cotización. Al guardar se persisten en COTIZACION_ETAPA y COTIZACION_ACTIVIDAD.
 *             También se acepta el alias legacy `etapas_detalle` (mismo JSON que antes iba solo a la columna JSON).
 *           properties:
 *             items:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id: { type: string, description: 'Referencia estable del front (fase-1, phase_1_...). El orden lo define la posición en items[].' }
 *                   id_bd: { type: integer, description: 'ID numérico en COTIZACION_ETAPA (solo en respuestas GET)' }
 *                   name: { type: string }
 *                   description: { type: string }
 *                   duration: { type: number }
 *                   activities:
 *                     type: array
 *                     items:
 *                       type: object
 *                       properties:
 *                         id: { type: string, description: 'Referencia estable (act-1, act-2). Orden = posición en activities[].' }
 *                         id_bd: { type: integer, description: 'ID numérico en COTIZACION_ACTIVIDAD (solo GET)' }
 *                         name: { type: string }
 *         productos:
 *           type: array
 *           description: Alias legacy de inventory
 *         servicios:
 *           type: array
 *           description: |
 *             Alias legacy de services. Cada ítem puede incluir Principal, indicaciones e id_servicio_subservicio.
 *             También acepta formato servicio_principal + servicios_secundarios (como en solicitudes).
 *         camiones:
 *           type: array
 *           description: Alias legacy de trucks
 *         costoRecojo:
 *           type: object
 *           description: Alias legacy de pickupService
 *         condiciones:
 *           type: object
 *           description: Alias legacy de quotationConditions
 *         tasaCambio:
 *           type: object
 *           description: Alias legacy de quotationRate
 *         etapas_detalle:
 *           type: object
 *           description: |
 *             Alias legacy del body (mismo shape que phases). Opcional si ya envías `phases`.
 *       example:
 *         name: "Cotización rociadores zona expansión"
 *         id_solicitud: 1
 *         fecha_inicio_proyecto: "2026-06-16"
 *         quotationConditions:
 *           emissionDate: "2026-06-14"
 *           expirationDate: "2026-06-28"
 *           observations: "Importada desde solicitud con servicio principal"
 *         services:
 *           - id: "1"
 *             name: "Instalación de Sistema de Rociadores (Sprinklers)"
 *             startDate: "2026-06-10"
 *             dueDate: "2026-06-20"
 *             schedule: "08:00 - 17:00"
 *             unitPrice: 15000
 *             Principal: true
 *             indicaciones: "Servicio principal con flujo de 3 etapas."
 *           - id: "8"
 *             name: "Instalación de Grupo Electrógeno"
 *             startDate: "2026-06-10"
 *             dueDate: "2026-06-20"
 *             schedule: "08:00 - 17:00"
 *             unitPrice: 3500
 *             Principal: false
 *             id_servicio_subservicio: 1
 *             indicaciones: "Subservicio recomendado: grupo electrógeno."
 */

/**
 * @openapi
 * /api/cotizaciones:
 *   get:
 *     tags: [Cotización]
 *     summary: Listar todas las cotizaciones comerciales
 *     parameters:
 *       - $ref: '#/components/parameters/PageQuery'
 *       - $ref: '#/components/parameters/LimitQuery'
 *       - $ref: '#/components/parameters/CotizacionEstadoQuery'
 *       - $ref: '#/components/parameters/CotizacionNombreQuery'
 *     responses:
 *       200:
 *         description: Lista de cotizaciones con metadatos de paginación
 *   post:
 *     tags: [Cotización]
 *     summary: Crear cotización (UpsertQuotationDTO o formato legacy)
 *     description: |
 *       Acepta el payload del frontend (`name`, `inventory`, `services`, `trucks`, etc.)
 *       y también el formato legacy (`nombre`, `productos`, `servicios`, `camiones`, etc.).
 *       **Requiere `id_solicitud`.** Si se envía, importa automáticamente:
 *       - Servicios con `Principal`, `indicaciones` e `id_servicio_subservicio` desde `SOLICITUD_SERVICIO`
 *       - Productos desde `SOLICITUD_INVENTARIO`
 *       - Cliente, nombre, observaciones y `ubicacion` → `direccion_recojo`
 *       - Etapas/actividades del servicio principal a `COTIZACION_ETAPA` / `COTIZACION_ACTIVIDAD` (con `duracion` en días)
 *         (actividades de subservicio solo si están en la solicitud)
 *       - Con `fecha_inicio_proyecto`, calcula `fecha_inicio`/`fecha_finalizacion` de servicios según duración de etapas
 *       - Si `pago_por_dia` del servicio es true, el total usa `precio_comercial × días`; si no, solo `precio_comercial`
 *       Los valores enviados en el body tienen prioridad sobre la solicitud.
 *       Si envías `phases` / `etapas_detalle`, se usa ese flujo en lugar del importado.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpsertQuotationDTO'
 *     responses:
 *       201:
 *         description: Cotización creada. Devuelve ID, precio_total y servicios insertados.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string, example: "Cotización creada" }
 *                 ID: { type: integer, example: 48 }
 *                 precio_total: { type: number, example: 18500 }
 *                 importado_desde_solicitud: { type: boolean, example: true }
 *                 servicios_insertados:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id: { type: integer, description: id COTIZACION_SERVICIO }
 *                       index: { type: integer }
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
 *     summary: Actualizar cotización (UpsertQuotationDTO o formato legacy)
 *     description: |
 *       Reemplaza secciones enviadas (`inventory`, `services`, `trucks`, etc.).
 *       También acepta alias legacy (`productos`, `servicios`, `camiones`, ...).
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
 *             $ref: '#/components/schemas/UpsertQuotationDTO'
 *     responses:
 *       200:
 *         description: Cotización actualizada. Devuelve el precio_total calculado.
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
 * /api/cotizaciones/{id}/aprobar:
 *   put:
 *     tags: [Cotización]
 *     summary: Aprobar cotización y generar proyecto
 *     description: |
 *       Crea un proyecto, trabajo, etapas/actividades y migra inventario,
 *       camiones y personal desde la cotización. Marca la cotización como aprobada.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Proyecto creado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Proyecto creado correctamente
 *                 id_proyecto:
 *                   type: integer
 *                 id_trabajo:
 *                   type: integer
 *       400:
 *         description: El cliente aún no adjunta la orden de compra
 *       409:
 *         description: La cotización ya fue aprobada
 *       404:
 *         description: Cotización no encontrada
 */
router.put('/:id/aprobar', auth, permit(['adminproy']), c.approve)

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
 * /api/cotizaciones/{id}/detalles-franco:
 *   get:
 *     tags: [Cotización]
 *     summary: Obtener detalles completos (UpsertQuotationDTO + legacy)
 *     description: |
 *       Devuelve el payload compatible con UpsertQuotationDTO (`name`, `inventory`, `services`, `trucks`, ...)
 *       y mantiene campos legacy (`productos`, `servicios`, `camiones`, `condiciones`, `tipoCambio`, etc.).
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *       - $ref: '#/components/parameters/CotizacionEstadoQuery'
 *       - $ref: '#/components/parameters/CotizacionNombreQuery'
 *     responses:
 *       200:
 *         description: Detalles completos (UpsertQuotationDTO + legacy con Principal, etapas y subservicios)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CotizacionDetalleFrancoResponse'
 *       404:
 *         description: No encontrada o no coincide con estado/nombre
 */
router.get('/:id/detalles-franco', auth, permit(['cliente', 'abogado', 'trabajtaller', 'gerente', 'adminproy']), c.getDetallesFranco);

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
 *               indicaciones: { type: string, nullable: true }
 *               id_servicio_subservicio: { type: integer, nullable: true, description: 'No se puede marcar Principal aquí' }
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
 *               indicaciones: { type: string, nullable: true }
 *               id_servicio_subservicio: { type: integer, nullable: true, description: 'No se puede marcar Principal aquí' }
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
 *             required: [Placa, uso]
 *             properties:
 *               Placa: { type: string }
 *               uso: { type: integer, description: id de COTIZACION_SERVICIO (fechas automáticas) }
 *               PrecioUnit: { type: number }
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
 *               uso: { type: integer, description: id de COTIZACION_SERVICIO }
 *               PrecioUnit: { type: number }
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
 * /api/cotizaciones/{id}/inventario-por-servicio:
 *   get:
 *     tags: [Cotización - Inventario]
 *     summary: Inventario requerido agregado por servicios de la cotización
 *     description: |
 *       Suma materiales de SERVICIO_INVENTARIO_REQUERIDO según los servicios en COTIZACION_SERVICIO.
 *       Agrupa por objeto y estancia (para inventario / para proyecto).
 *       El costo de faltante solo aplica a estancia "para inventario" (stock en taller).
 *       Pensado para el flujo de presupuestos sin depender de un proyecto.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *         description: ID_Cotizacion
 *     responses:
 *       200:
 *         description: Objetos requeridos con stock en taller y costo de faltante
 *       404:
 *         description: Cotización no encontrada
 */
router.get(
    '/:id/inventario-por-servicio',
    auth,
    permit(['cliente', 'abogado', 'trabajtaller', 'gerente', 'adminproy']),
    c.getInventarioPorServicio,
);

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

/**
 * @openapi
 * /api/cotizaciones/{id}/chat:
 *   get:
 *     tags: [Cotización - Chat]
 *     summary: Obtener el historial del chat
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Historial de mensajes
 *   post:
 *     tags: [Cotización - Chat]
 *     summary: Enviar un mensaje de chat
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
 *             required: [mensaje]
 *             properties:
 *               mensaje: { type: string, example: "Hola, podemos negociar el precio de los rociadores?" }
 *               nombre_remitente: { type: string, example: "Juan Perez" }
 *     responses:
 *       201:
 *         description: Mensaje enviado exitosamente
 */
router.get('/:id/chat', auth, permit(['cliente', 'gerente', 'adminproy']), c.getChatHistory);
router.post('/:id/chat', auth, permit(['cliente', 'gerente', 'adminproy']), c.sendChatMessage);

/**
 * @openapi
 * /api/cotizaciones/{id}/orden-compra:
 *   get:
 *     tags: [Cotización - Documentos]
 *     summary: Descargar o visualizar la orden de compra
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Archivo PDF
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *   post:
 *     tags: [Cotización - Documentos]
 *     summary: Subir la orden de compra (PDF)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               orden_compra:
 *                 type: string
 *                 format: binary
 *                 description: Archivo PDF de la orden de compra
 *     responses:
 *       200:
 *         description: Orden de compra subida correctamente
 */
router.get('/:id/orden-compra', auth, c.getOrdenCompra);
router.post('/:id/orden-compra',
    auth,
    permit(['cliente', 'gerente', 'adminproy']),
    uploadCotizacion.single('orden_compra'),
    requireFile,
    c.uploadOrdenCompra
);

module.exports = router;
