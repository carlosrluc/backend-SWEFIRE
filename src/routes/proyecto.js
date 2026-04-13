const router = require('express').Router();
const c = require('../controllers/proyecto.controller');

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
 */

/**
 * @openapi
 * /api/proyectos:
 *   get:
 *     tags: [Proyecto]
 *     summary: Listar todos los proyectos
 *     responses:
 *       200:
 *         description: Lista de proyectos
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
 *               fecha_inicio: { type: string, format: date }
 *               fecha_fin: { type: string, format: date }
 *               observaciones: { type: string }
 *               estado: { type: string, enum: [Pendiente, "En Ejecución", Completado, "En proceso legal"] }
 *     responses:
 *       201:
 *         description: Proyecto creado
 */
router.get('/', c.getAll);
router.post('/', c.create);

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
 *               estado: { type: string, enum: [Pendiente, "En Ejecución", Completado, "En proceso legal"] }
 *               observaciones: { type: string }
 *               fecha_fin: { type: string, format: date }
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
router.get('/:id', c.getById);
router.put('/:id', c.update);
router.delete('/:id', c.remove);

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
 *     responses:
 *       201:
 *         description: Camión asignado
 */
router.get('/:id/camiones', c.getCamiones);
router.post('/:id/camiones', c.createCamion);

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
router.delete('/:id/camiones/:cid', c.deleteCamion);

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
router.get('/:id/documentacion', c.getDocumentacion);
router.post('/:id/documentacion', c.createDocumentacion);

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
router.delete('/:id/documentacion/:did', c.deleteDocumentacion);

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
 *               estado_post: { type: string, enum: [aceptable, robado, averiado, desconocido] }
 *               fecha_salida: { type: string, format: date }
 *               fecha_retorno: { type: string, format: date }
 *               metodo_traslado: { type: string }
 *     responses:
 *       201:
 *         description: Inventario asignado
 */
router.get('/:id/inventario', c.getInventario);
router.post('/:id/inventario', c.createInventario);

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
router.delete('/:id/inventario/:iid', c.deleteInventario);

module.exports = router;
