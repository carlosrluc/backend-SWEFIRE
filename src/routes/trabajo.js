const router = require('express').Router();
const c = require('../controllers/trabajo.controller');
const { uploadPDF } = require('../middlewares/upload.middleware');

/**
 * @openapi
 * tags:
 *   - name: Trabajo
 *     description: Jornadas de trabajo por proyecto (un registro = un día de un trabajador)
 *   - name: Trabajo - RRHH
 *     description: Datos de RRHH del trabajo
 *   - name: Trabajo - RRHH PDFs
 *     description: PDFs adjuntos al registro RRHH
 */

/**
 * @openapi
 * components:
 *   schemas:
 *     TrabajoItem:
 *       type: object
 *       properties:
 *         Id_trabajo: { type: integer }
 *         Id_Proyecto: { type: integer }
 *         ID_Servicio: { type: integer, nullable: true }
 *         dia: { type: string, format: date }
 *         horario_entrada: { type: string, example: "08:00:00" }
 *         horario_salida: { type: string, example: "17:00:00" }
 *         DNI_Trabajador: { type: string, nullable: true, description: 'NULL hasta asignar trabajador' }
 *         profesion:
 *           type: string
 *           enum: [bombero, "ingeniero de sistemas", "ingeniero sanitario", SSOMA, "Supervisor de planta", "ingeniero ambiental", mecanico, tecnico, arquitecto, piloto, otros]
 *         asistencia: { type: string, enum: [Programada, Cancelada, Realizada] }
 *         comentario: { type: string, nullable: true }
 */

/**
 * @openapi
 * /api/trabajos:
 *   get:
 *     tags: [Trabajo]
 *     summary: Listar trabajos (jornadas)
 *     parameters:
 *       - in: query
 *         name: Id_Proyecto
 *         schema: { type: integer }
 *       - in: query
 *         name: dia
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: profesion
 *         schema: { type: string }
 *       - in: query
 *         name: DNI_Trabajador
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Lista paginada de trabajos
 *   post:
 *     tags: [Trabajo]
 *     summary: Crear jornada de trabajo
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TrabajoItem'
 *     responses:
 *       201:
 *         description: Trabajo creado
 */
router.get('/', c.getAll);
router.post('/', c.create);

/**
 * @openapi
 * /api/trabajos/proyecto/{proyectoId}:
 *   get:
 *     tags: [Trabajo]
 *     summary: Listar todas las jornadas de un proyecto
 *     parameters:
 *       - in: path
 *         name: proyectoId
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Lista de jornadas del proyecto
 */
router.get('/proyecto/:proyectoId', c.getByProyecto);

/**
 * @openapi
 * /api/trabajos/{id}:
 *   get:
 *     tags: [Trabajo]
 *     summary: Obtener trabajo por ID
 *   put:
 *     tags: [Trabajo]
 *     summary: Actualizar trabajo (asignar DNI_Trabajador, asistencia, etc.)
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TrabajoItem'
 *   delete:
 *     tags: [Trabajo]
 *     summary: Eliminar trabajo
 */
router.get('/:id', c.getById);
router.put('/:id', c.update);
router.delete('/:id', c.remove);

/**
 * @openapi
 * /api/trabajos/{id}/rrhh:
 *   get:
 *     tags: [Trabajo - RRHH]
 *     summary: Listar registros RRHH del trabajo
 *   post:
 *     tags: [Trabajo - RRHH]
 *     summary: Registrar RRHH de trabajador
 */
router.get('/:id/rrhh', c.getRRHH);
router.post('/:id/rrhh', c.createRRHH);

router.delete('/:id/rrhh/:rid', c.deleteRRHH);
router.get('/:id/rrhh/:rid/pdf', c.getRRHHPDF);
router.post('/:id/rrhh/:rid/pdf', uploadPDF.single('pdf_RRHH'), c.uploadRRHHPDF);

module.exports = router;
