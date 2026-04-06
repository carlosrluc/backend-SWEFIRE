const router = require('express').Router();
const c = require('../controllers/perfil.controller');

/**
 * @openapi
 * tags:
 *   - name: Perfil
 *     description: Gestión de perfiles de empleados
 *   - name: Perfil - Educación
 *     description: Sub-tabla educación del perfil
 *   - name: Perfil - Brevete
 *     description: Sub-tabla brevetes del perfil
 *   - name: Perfil - Certificaciones
 *     description: Sub-tabla certificaciones del perfil
 */

/**
 * @openapi
 * /api/perfiles:
 *   get:
 *     tags: [Perfil]
 *     summary: Listar todos los perfiles
 *     responses:
 *       200:
 *         description: Lista de perfiles
 *   post:
 *     tags: [Perfil]
 *     summary: Crear un perfil
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [DNI, Nombre, Apellido]
 *             properties:
 *               DNI: { type: string, example: "12345678" }
 *               Nombre: { type: string, example: "Juan" }
 *               Apellido: { type: string, example: "Pérez" }
 *               Genero: { type: string, example: "Masculino" }
 *               RUC: { type: string }
 *               fecha_nacimiento: { type: string, format: date, example: "1990-01-15" }
 *               correo_contacto: { type: string, example: "juan@email.com" }
 *               telefono_contacto: { type: string, example: "987654321" }
 *               estado_civil: { type: string, example: "Soltero" }
 *               distrito_residencia: { type: string }
 *               seguro_vida_ley: { type: string, enum: [si, no] }
 *               aficiones: { type: string }
 *               experiencia: { type: string }
 *               comentarios: { type: string }
 *               estado: { type: string, enum: [inhabilitado, "en trabajo", disponible] }
 *               alergias: { type: string }
 *               condicion_medica: { type: string }
 *               profesion: { type: string }
 *               nro_cta_bancaria: { type: string }
 *               cv: { type: string }
 *               foto_perfil: { type: string }
 *     responses:
 *       201:
 *         description: Perfil creado
 */
router.get('/', c.getAll);
router.post('/', c.create);

/**
 * @openapi
 * /api/perfiles/{dni}:
 *   get:
 *     tags: [Perfil]
 *     summary: Obtener perfil por DNI
 *     parameters:
 *       - in: path
 *         name: dni
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Perfil encontrado
 *       404:
 *         description: No encontrado
 *   put:
 *     tags: [Perfil]
 *     summary: Actualizar perfil
 *     parameters:
 *       - in: path
 *         name: dni
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               Nombre: { type: string }
 *               Apellido: { type: string }
 *               estado: { type: string, enum: [inhabilitado, "en trabajo", disponible] }
 *     responses:
 *       200:
 *         description: Perfil actualizado
 *   delete:
 *     tags: [Perfil]
 *     summary: Eliminar perfil
 *     parameters:
 *       - in: path
 *         name: dni
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Perfil eliminado
 */
router.get('/:dni', c.getById);
router.put('/:dni', c.update);
router.delete('/:dni', c.remove);

/**
 * @openapi
 * /api/perfiles/{dni}/educacion:
 *   get:
 *     tags: [Perfil - Educación]
 *     summary: Listar educaciones del perfil
 *     parameters:
 *       - in: path
 *         name: dni
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Lista de educaciones
 *   post:
 *     tags: [Perfil - Educación]
 *     summary: Agregar educación al perfil
 *     parameters:
 *       - in: path
 *         name: dni
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nombre_educacion: { type: string }
 *               nivel_educacion: { type: string, example: "Universidad" }
 *               institucion: { type: string }
 *     responses:
 *       201:
 *         description: Educación creada
 */
router.get('/:dni/educacion', c.getEducacion);
router.post('/:dni/educacion', c.createEducacion);

/**
 * @openapi
 * /api/perfiles/{dni}/educacion/{id}:
 *   put:
 *     tags: [Perfil - Educación]
 *     summary: Actualizar educación
 *     parameters:
 *       - in: path
 *         name: dni
 *         required: true
 *         schema: { type: string }
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
 *               nombre_educacion: { type: string }
 *               nivel_educacion: { type: string }
 *               institucion: { type: string }
 *     responses:
 *       200:
 *         description: Actualizado
 *   delete:
 *     tags: [Perfil - Educación]
 *     summary: Eliminar educación
 *     parameters:
 *       - in: path
 *         name: dni
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Eliminado
 */
router.put('/:dni/educacion/:id', c.updateEducacion);
router.delete('/:dni/educacion/:id', c.deleteEducacion);

/**
 * @openapi
 * /api/perfiles/{dni}/brevetes:
 *   get:
 *     tags: [Perfil - Brevete]
 *     summary: Listar brevetes del perfil
 *     parameters:
 *       - in: path
 *         name: dni
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Lista de brevetes
 *   post:
 *     tags: [Perfil - Brevete]
 *     summary: Agregar brevete al perfil
 *     parameters:
 *       - in: path
 *         name: dni
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               categoria: { type: string, example: "A-IIb" }
 *               pdf_brevete: { type: string }
 *               fecha_vencimiento: { type: string, format: date }
 *     responses:
 *       201:
 *         description: Brevete creado
 */
router.get('/:dni/brevetes', c.getBrevete);
router.post('/:dni/brevetes', c.createBrevete);

/**
 * @openapi
 * /api/perfiles/{dni}/brevetes/{id}:
 *   put:
 *     tags: [Perfil - Brevete]
 *     summary: Actualizar brevete
 *     parameters:
 *       - in: path
 *         name: dni
 *         required: true
 *         schema: { type: string }
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
 *               categoria: { type: string }
 *               pdf_brevete: { type: string }
 *               fecha_vencimiento: { type: string, format: date }
 *     responses:
 *       200:
 *         description: Actualizado
 *   delete:
 *     tags: [Perfil - Brevete]
 *     summary: Eliminar brevete
 *     parameters:
 *       - in: path
 *         name: dni
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Eliminado
 */
router.put('/:dni/brevetes/:id', c.updateBrevete);
router.delete('/:dni/brevetes/:id', c.deleteBrevete);

/**
 * @openapi
 * /api/perfiles/{dni}/certificaciones:
 *   get:
 *     tags: [Perfil - Certificaciones]
 *     summary: Listar certificaciones del perfil
 *     parameters:
 *       - in: path
 *         name: dni
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Lista de certificaciones
 *   post:
 *     tags: [Perfil - Certificaciones]
 *     summary: Agregar certificación al perfil
 *     parameters:
 *       - in: path
 *         name: dni
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nombre: { type: string }
 *               institucion: { type: string }
 *               fecha_validez: { type: string, format: date }
 *               foto: { type: string }
 *     responses:
 *       201:
 *         description: Certificación creada
 */
router.get('/:dni/certificaciones', c.getCertificacion);
router.post('/:dni/certificaciones', c.createCertificacion);

/**
 * @openapi
 * /api/perfiles/{dni}/certificaciones/{id}:
 *   put:
 *     tags: [Perfil - Certificaciones]
 *     summary: Actualizar certificación
 *     parameters:
 *       - in: path
 *         name: dni
 *         required: true
 *         schema: { type: string }
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
 *               institucion: { type: string }
 *               fecha_validez: { type: string, format: date }
 *               foto: { type: string }
 *     responses:
 *       200:
 *         description: Actualizado
 *   delete:
 *     tags: [Perfil - Certificaciones]
 *     summary: Eliminar certificación
 *     parameters:
 *       - in: path
 *         name: dni
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Eliminado
 */
router.put('/:dni/certificaciones/:id', c.updateCertificacion);
router.delete('/:dni/certificaciones/:id', c.deleteCertificacion);

module.exports = router;
