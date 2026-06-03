const router = require('express').Router();
const c = require('../controllers/proyecto.controller');
const incidenciaC = require('../controllers/incidencia.controller');
const informe = require('../controllers/informe.controller');
const auth = require('../middlewares/auth.middleware');
const { permit } = require('../middlewares/role.middleware');
const { uploadInformeEvidencia } = require('../middlewares/upload.middleware');

/**
 * @openapi
 * tags:
 *   - name: Proyecto
 *     description: Gestión de proyectos
 *   - name: Proyecto - Camiones
 *     description: Camiones del proyecto
 *   - name: Proyecto - Documentación
 *     description: Documentos del proyecto
 *   - name: Proyecto - Inventario
 *     description: Inventario del proyecto
 *   - name: Proyecto - Informes
 *     description: Sucesos / informes del proyecto
 *   - name: Proyecto - Incidencias
 *     description: Incidencias asociadas al proyecto
 */

/**
 * @openapi
 * /api/proyectos:
 *   get:
 *     tags: [Proyecto]
 *     summary: Listar todos los proyectos
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
 *         description: Lista de proyectos con metadatos de paginación
 *   post:
 *     tags: [Proyecto]
 *     summary: Crear un proyecto
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               descripcion_servicio: { type: string }
 *               Id_Cliente: { type: string }
 *               ubicacion: { type: string }
 *               id_cotizacion: { type: integer }
 *               orden_compra: { type: string, description: "URL de redirección al PDF de la cotización" }
 *               fecha_inicio: { type: string, format: date }
 *               fecha_fin: { type: string, format: date }
 *               observaciones: { type: string }
 *               estado: { type: string, enum: ["No iniciado", "En Ejecución", Completado, "En proceso legal"] }
 *     responses:
 *       201:
 *         description: Proyecto creado
 */
router.get('/', auth, c.getAll); // anyone logged in can GET
router.post('/', auth, permit(['supervisorcampo', 'trabajcampo', 'abogado', 'gerente', 'adminproy']), c.create);

/**
 * @openapi
 * /api/proyectos/activos-completados:
 *   get:
 *     tags: [Proyecto]
 *     summary: Obtener proyectos en ejecución y completados (ordenados)
 *     description: Retorna proyectos en estado "En Ejecución" y "Completado". Primero lista los en ejecución, luego los completados, ordenados por fecha_fin de más lejano a más reciente. Además auto-actualiza los estados según la fecha actual.
 *     responses:
 *       200:
 *         description: Lista de proyectos
 */
router.get('/activos-completados', auth, c.getActiveAndCompleted);

/**
 * @openapi
 * /api/proyectos/{id}:
 *   get:
 *     tags: [Proyecto]
 *     summary: Obtener proyecto por ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Proyecto encontrado
 *       404:
 *         description: No encontrado
 *   put:
 *     tags: [Proyecto]
 *     summary: Actualizar proyecto
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
 *               estado: { type: string, enum: ["No iniciado", "En Ejecución", Completado, "En proceso legal"] }
 *               observaciones: { type: string }
 *               fecha_fin: { type: string, format: date }
 *               orden_compra: { type: string, description: "URL de redirección al PDF de la cotización" }
 *     responses:
 *       200:
 *         description: Actualizado
 *   delete:
 *     tags: [Proyecto]
 *     summary: Eliminar proyecto
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Eliminado
 */
router.get('/:id', auth, c.getById);

/**
 * @openapi
 * /api/proyectos/{id}/proyecto_todo:
 *   get:
 *     tags: [Proyecto]
 *     summary: Obtener toda la información del proyecto incluyendo camiones, inventario y envío
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Información completa del proyecto
 *       404:
 *         description: Proyecto no encontrado
 */
router.get('/:id/proyecto_todo', auth, c.proyecto_todo);
router.put('/:id', auth, permit(['cliente', 'supervisorcampo', 'abogado', 'gerente', 'adminproy']), c.update);
router.delete('/:id', auth, permit(['gerente', 'adminproy']), c.remove);

/**
 * @openapi
 * /api/proyectos/{id}/camiones:
 *   get:
 *     tags: [Proyecto - Camiones]
 *     summary: Listar camiones del proyecto
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Lista de camiones
 *   post:
 *     tags: [Proyecto - Camiones]
 *     summary: Asignar camión al proyecto
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
 *               personal_manejando: { type: integer }
 *               fecha_hora_entrada: { type: string, format: date-time }
 *               fecha_hora_salida: { type: string, format: date-time }
 *               estado: { type: string, enum: [aceptable, robado, averiado, desconocido] }
 *               razon: { type: string }
 *     responses:
 *       201:
 *         description: Camión asignado
 */
// ── PROYECTO_CAMIONES ───────────────────────────────────────────────────────
router.get('/:id/camiones', auth, c.getCamiones);
router.post('/:id/camiones', auth, permit(['supervisorcampo', 'trabajcampo', 'abogado', 'gerente', 'adminproy']), c.createCamion);
/**
 * @openapi
 * /api/proyectos/{id}/camiones/{cid}:
 *   put:
 *     tags: [Proyecto - Camiones]
 *     summary: Actualizar datos del camión asignado al proyecto
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
 *               personal_manejando: { type: integer }
 *               fecha_hora_entrada: { type: string, format: date-time }
 *               fecha_hora_salida: { type: string, format: date-time }
 *               estado: { type: string, enum: [aceptable, robado, averiado, desconocido] }
 *               razon: { type: string }
 *     responses:
 *       200:
 *         description: Camión actualizado
 */
router.put('/:id/camiones/:cid', auth, permit(['gerente', 'adminproy']), c.updateCamion);

/**
 * @openapi
 * /api/proyectos/{id}/camiones/{cid}:
 *   delete:
 *     tags: [Proyecto - Camiones]
 *     summary: Retirar camión del proyecto
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
 * /api/proyectos/{id}/documentacion:
 *   get:
 *     tags: [Proyecto - Documentación]
 *     summary: Listar documentos del proyecto
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Lista de documentos
 *   post:
 *     tags: [Proyecto - Documentación]
 *     summary: Agregar documento al proyecto
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
 *               pdf_url: { type: string }
 *     responses:
 *       201:
 *         description: Documento creado
 */
router.get('/:id/documentacion', auth, c.getDocumentacion);
router.post('/:id/documentacion', auth, permit(['supervisorcampo', 'trabajcampo', 'abogado', 'gerente', 'adminproy']), c.createDocumentacion);

/**
 * @openapi
 * /api/proyectos/{id}/documentacion/{did}:
 *   delete:
 *     tags: [Proyecto - Documentación]
 *     summary: Eliminar documento del proyecto
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *       - in: path
 *         name: did
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Eliminado
 */
router.delete('/:id/documentacion/:did', auth, permit(['gerente', 'adminproy']), c.deleteDocumentacion);

/**
 * @openapi
 * /api/proyectos/{id}/inventario-por-servicio:
 *   get:
 *     tags: [Proyecto - Inventario]
 *     summary: Inventario requerido agregado por servicios de la cotización
 *     description: |
 *       Suma materiales de SERVICIO_INVENTARIO_REQUERIDO por estancia (para inventario / para proyecto).
 *       El costo de faltante solo aplica a estancia "para inventario" (stock en taller).
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Objetos requeridos con stock en taller y costo de faltante
 *       404:
 *         description: Proyecto no encontrado
 */
router.get('/:id/inventario-por-servicio', auth, c.getInventarioPorServicio);

/**
 * @openapi
 * /api/proyectos/{id}/inventario-por-servicio/exportar:
 *   post:
 *     tags: [Proyecto - Inventario]
 *     summary: Exportar inventario disponible al proyecto
 *     description: |
 *       Toma el inventario agregado por servicios (misma lógica que GET inventario-por-servicio).
 *       Para estancia "para inventario": asigna al proyecto solo lo disponible en taller (min requerido, stock).
 *       Para estancia "para proyecto": asigna la cantidad requerida completa sin descontar taller.
 *       fecha_salida y fecha_retorno del lote = fecha_inicio y fecha_fin del proyecto.
 *       Los faltantes van al presupuesto vía POST /api/presupuestos/cotizacion/{id}/faltantes-inventario/exportar.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       201:
 *         description: Lotes creados en PROYECTO_INVENTARIO
 *       400:
 *         description: Proyecto sin cotización
 *       404:
 *         description: Proyecto no encontrado
 */
router.post(
    '/:id/inventario-por-servicio/exportar',
    auth,
    permit(['supervisorcampo', 'trabajcampo', 'abogado', 'gerente', 'adminproy']),
    c.exportInventarioPorServicio,
);

/**
 * @openapi
 * /api/proyectos/{id}/inventario:
 *   get:
 *     tags: [Proyecto - Inventario]
 *     summary: Listar inventario del proyecto
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Lista de inventario
 *   post:
 *     tags: [Proyecto - Inventario]
 *     summary: Asignar inventario al proyecto
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
 *             required: [Id_Objeto]
 *             properties:
 *               Id_Objeto: { type: integer }
 *               cantidad_objeto: { type: integer }
 *               estado: { type: string, enum: [aceptable, robado, averiado, desconocido] }
 *               razon: { type: string }
 *               fecha_salida: { type: string, format: date }
 *               fecha_retorno: { type: string, format: date }
 *               metodo_traslado: { type: string, description: "Texto libre (ej: taxi, remolque, etc). No determina si va por camión." }
 *               placa_camion: { type: string, description: "Si el traslado es por camión, enviar la placa explícitamente." }
 *               id_proyecto_camion: { type: integer, description: "Alternativa a placa_camion: id del viaje en PROYECTO_CAMION." }
 *     responses:
 *       201:
 *         description: Inventario asignado
 */
router.get('/:id/inventario', auth, c.getInventario);
router.post('/:id/inventario', auth, permit(['supervisorcampo', 'trabajcampo', 'abogado', 'gerente', 'adminproy']), c.createInventario);

/**
 * @openapi
 * /api/proyectos/{id}/inventario/{iid}:
 *   delete:
 *     tags: [Proyecto - Inventario]
 *     summary: Retirar inventario del proyecto
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
/**
 * @openapi
 * /api/proyectos/{id}/inventario/{iid}:
 *   put:
 *     tags: [Proyecto - Inventario]
 *     summary: Actualizar inventario del proyecto
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
 *               Id_Objeto: { type: integer }
 *               cantidad_objeto: { type: integer }
 *               estado: { type: string, enum: [aceptable, robado, averiado, desconocido] }
 *               razon: { type: string }
 *               fecha_salida: { type: string, format: date }
 *               fecha_retorno: { type: string, format: date }
 *               metodo_traslado: { type: string }
 *     responses:
 *       200:
 *         description: Inventario actualizado
 */
router.get('/:id/inventario/:iid', auth, c.getInventarioById);
router.put('/:id/inventario/:iid', auth, permit(['supervisorcampo', 'trabajcampo', 'abogado', 'gerente', 'adminproy']), c.updateInventario);

/**
 * @openapi
 * /api/proyectos/{id}/incidencias:
 *   get:
 *     tags: [Proyecto - Incidencias]
 *     summary: Listar incidencias del proyecto
 *     description: |
 *       Incidencias con id_proyecto = {id}. Misma respuesta que
 *       GET /api/incidencias/proyecto/{id_proyecto}.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *         description: id_Proyecto
 *       - in: query
 *         name: estado
 *         required: false
 *         schema:
 *           type: string
 *           enum:
 *             - 'Sin enviar'
 *             - 'Cotizacion sin respuesta'
 *             - 'Cotizacion disputada'
 *             - 'Pago por recibir'
 *             - 'Pago realizado'
 *             - 'Material recuperado'
 *     responses:
 *       200:
 *         description: Lista de incidencias del proyecto
 *       404:
 *         description: Proyecto no encontrado
 */
router.get(
    '/:id/incidencias',
    auth,
    permit(['cliente', 'abogado', 'trabajtaller', 'gerente', 'adminproy', 'supervisorcampo']),
    incidenciaC.getByProyecto,
);

/**
 * @openapi
 * /api/proyectos/{id}/informes:
 *   get:
 *     tags: [Proyecto - Informes]
 *     summary: Listar sucesos/informes del proyecto
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *       - in: query
 *         name: nombre
 *         schema: { type: string }
 *         description: Filtrar por nombre del informe (parcial)
 *       - in: query
 *         name: id_incidencia
 *         schema: { type: integer }
 *         description: Filtrar por incidencia relacionada
 *       - in: query
 *         name: relacion
 *         schema: { type: string, enum: [ninguna] }
 *         description: Usar "ninguna" para sucesos sin incidencia vinculada
 *     responses:
 *       200:
 *         description: Lista de informes (incluye Autor_Nombre, Autor_Apellido y autor_nombre)
 *   post:
 *     tags: [Proyecto - Informes]
 *     summary: Registrar un suceso en el informe del proyecto
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
 *             required: [hora]
 *             properties:
 *               nombre: { type: string, description: "Por defecto copia Proyecto_Nombre" }
 *               hora: { type: string, example: "14:30:00" }
 *               descripcion: { type: string }
 *               ubicacion: { type: string, example: "recepcion de la planta" }
 *               relacion: { type: string, description: '"ninguna" o id de incidencia' }
 *               id_incidencia: { type: integer, description: "Alternativa a relacion" }
 *     description: DNI_autor se toma automáticamente del usuario logueado (JWT)
 *     responses:
 *       201:
 *         description: Informe creado
 */
router.get('/:id/informes', auth, informe.getInformes);
router.post('/:id/informes', auth, permit(['supervisorcampo', 'trabajcampo', 'abogado', 'gerente', 'adminproy']), informe.createInforme);

/**
 * @openapi
 * /api/proyectos/{id}/informes/{iid}:
 *   get:
 *     tags: [Proyecto - Informes]
 *     summary: Obtener un suceso del informe
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
 *         description: Informe encontrado
 *   put:
 *     tags: [Proyecto - Informes]
 *     summary: Actualizar suceso del informe
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
 *               nombre: { type: string }
 *               hora: { type: string }
 *               descripcion: { type: string }
 *               ubicacion: { type: string }
 *               relacion: { type: string }
 *               id_incidencia: { type: integer }
 *     responses:
 *       200:
 *         description: Informe actualizado
 *   delete:
 *     tags: [Proyecto - Informes]
 *     summary: Eliminar suceso del informe
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
router.get('/:id/informes/:iid', auth, informe.getInformeById);
router.put('/:id/informes/:iid', auth, permit(['supervisorcampo', 'trabajcampo', 'abogado', 'gerente', 'adminproy']), informe.updateInforme);
router.delete('/:id/informes/:iid', auth, permit(['gerente', 'adminproy']), informe.deleteInforme);

/**
 * @openapi
 * /api/proyectos/{id}/informes/{iid}/evidencia:
 *   get:
 *     tags: [Proyecto - Informes]
 *     summary: Ver/descargar evidencia (PNG/JPEG)
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
 *         description: Imagen de evidencia
 *   post:
 *     tags: [Proyecto - Informes]
 *     summary: Subir evidencia fotográfica (PNG/JPEG)
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
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               evidencia:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Evidencia subida
 */
router.get('/:id/informes/:iid/evidencia', auth, informe.getEvidencia);
router.post('/:id/informes/:iid/evidencia', auth, permit(['supervisorcampo', 'trabajcampo', 'abogado', 'gerente', 'adminproy']), uploadInformeEvidencia.single('evidencia'), informe.uploadEvidencia);

module.exports = router;
