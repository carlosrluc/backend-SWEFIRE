const router = require('express').Router();
const c = require('../controllers/trabajo.controller');

/**
 * @openapi
 * tags:
 *   - name: Trabajo
 *     description: Gestión de jornadas de trabajo
 *   - name: Trabajo - Jornada
 *     description: Jornadas detalladas por trabajador
 *   - name: Trabajo - RRHH
 *     description: Datos de RRHH del trabajo
 *   - name: Trabajo - RRHH PDFs
 *     description: PDFs adjuntos al registro RRHH
 */

/**
 * @openapi
 * /api/trabajos:
 *   get:
 *     tags: [Trabajo]
 *     summary: Listar todos los trabajos
 *     responses:
 *       200:
 *         description: Lista de trabajos
 *   post:
 *     tags: [Trabajo]
 *     summary: Crear un trabajo
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               Id_Proyecto: { type: integer }
 *               fecha: { type: string, format: date }
 *               horario: { type: string }
 *               asistencia: { type: string, enum: [Programada, Cancelada, Realizada] }
 *               comentario: { type: string }
 *     responses:
 *       201:
 *         description: Trabajo creado
 */
router.get('/', c.getAll);
router.post('/', c.create);

/**
 * @openapi
 * /api/trabajos/{id}:
 *   get:
 *     tags: [Trabajo]
 *     summary: Obtener trabajo por ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Trabajo encontrado
 *       404:
 *         description: No encontrado
 *   put:
 *     tags: [Trabajo]
 *     summary: Actualizar trabajo
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
 *               fecha: { type: string, format: date }
 *               horario: { type: string }
 *               asistencia: { type: string, enum: [Programada, Cancelada, Realizada] }
 *               comentario: { type: string }
 *     responses:
 *       200:
 *         description: Actualizado
 *   delete:
 *     tags: [Trabajo]
 *     summary: Eliminar trabajo
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
 * /api/trabajos/{id}/jornadas:
 *   get:
 *     tags: [Trabajo - Jornada]
 *     summary: Listar jornadas del trabajo
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Lista de jornadas
 *   post:
 *     tags: [Trabajo - Jornada]
 *     summary: Registrar jornada de un trabajador
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
 *             required: [DNI_Trabajador]
 *             properties:
 *               DNI_Trabajador: { type: string }
 *               dia: { type: string, format: date }
 *               horario_entrada: { type: string, example: "08:00:00" }
 *               horario_salida: { type: string, example: "17:00:00" }
 *     responses:
 *       201:
 *         description: Jornada creada
 */
router.get('/:id/jornadas', c.getJornadas);
router.post('/:id/jornadas', c.createJornada);

/**
 * @openapi
 * /api/trabajos/{id}/jornadas/{jid}:
 *   delete:
 *     tags: [Trabajo - Jornada]
 *     summary: Eliminar jornada
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *       - in: path
 *         name: jid
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Jornada eliminada
 */
router.delete('/:id/jornadas/:jid', c.deleteJornada);

/**
 * @openapi
 * /api/trabajos/{id}/rrhh:
 *   get:
 *     tags: [Trabajo - RRHH]
 *     summary: Listar registros RRHH del trabajo
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Lista de RRHH
 *   post:
 *     tags: [Trabajo - RRHH]
 *     summary: Registrar RRHH de trabajador
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
 *             required: [DNI_Trabajador]
 *             properties:
 *               DNI_Trabajador: { type: string }
 *               estado_pago: { type: string, enum: [completado, "por realizar", "no pagar aun", "devolucion pendiente"] }
 *     responses:
 *       201:
 *         description: RRHH creado
 */
router.get('/:id/rrhh', c.getRRHH);
router.post('/:id/rrhh', c.createRRHH);

/**
 * @openapi
 * /api/trabajos/{id}/rrhh/{rid}:
 *   delete:
 *     tags: [Trabajo - RRHH]
 *     summary: Eliminar registro RRHH
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *       - in: path
 *         name: rid
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Eliminado
 */
router.delete('/:id/rrhh/:rid', c.deleteRRHH);

/**
 * @openapi
 * /api/trabajos/{id}/rrhh/{rid}/pdfs:
 *   get:
 *     tags: [Trabajo - RRHH PDFs]
 *     summary: Listar PDFs del registro RRHH
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *       - in: path
 *         name: rid
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Lista de PDFs
 *   post:
 *     tags: [Trabajo - RRHH PDFs]
 *     summary: Agregar PDF al registro RRHH
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *       - in: path
 *         name: rid
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
 *         description: PDF creado
 */
router.get('/:id/rrhh/:rid/pdfs', c.getRRHHPdfs);
router.post('/:id/rrhh/:rid/pdfs', c.createRRHHPdf);

/**
 * @openapi
 * /api/trabajos/{id}/rrhh/{rid}/pdfs/{pid}:
 *   delete:
 *     tags: [Trabajo - RRHH PDFs]
 *     summary: Eliminar PDF del registro RRHH
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *       - in: path
 *         name: rid
 *         required: true
 *         schema: { type: integer }
 *       - in: path
 *         name: pid
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: PDF eliminado
 */
router.delete('/:id/rrhh/:rid/pdfs/:pid', c.deleteRRHHPdf);

module.exports = router;
