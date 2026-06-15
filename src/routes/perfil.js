const router = require('express').Router();
const c = require('../controllers/perfil.controller');
const { uploadPDF, uploadImage } = require('../middlewares/upload.middleware');

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
 * /api/perfiles/conductores/disponibles:
 *   get:
 *     tags: [Perfil]
 *     summary: Obtener conductores con brevete disponibles en una fecha
 *     parameters:
 *       - in: query
 *         name: fecha
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Fecha a consultar disponiblidad (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Lista de conductores disponibles
 *       400:
 *         description: Fecha faltante
 */
/**
 * @openapi
 * /api/perfiles/trabajadores/disponibles:
 *   get:
 *     tags: [Perfil]
 *     summary: Obtener trabajadores disponibles en una fecha
 *     parameters:
 *       - in: query
 *         name: fecha
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Fecha para la cual verificar disponibilidad (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Lista de trabajadores disponibles
 */
router.get('/trabajadores/disponibles', c.getTrabajadoresDisponibles);

/**
 * @openapi
 * /api/perfiles/disponibles:
 *   get:
 *     tags: [Perfil]
 *     summary: Profesionales disponibles por clasificación y fecha
 *     description: |
 *       Filtra por `profesion_clasificacion`. Si la profesión es **piloto**, exige brevete vigente (PERFIL_BREVETE).
 *       Excluye perfiles ya asignados en TRABAJO para la fecha indicada.
 *     parameters:
 *       - in: query
 *         name: fecha
 *         required: true
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: profesion
 *         required: true
 *         schema:
 *           type: string
 *           enum: [bombero, "ingeniero de sistemas", "ingeniero sanitario", SSOMA, "Supervisor de planta", "ingeniero ambiental", mecanico, tecnico, arquitecto, piloto, otros]
 *     responses:
 *       200:
 *         description: Lista de profesionales disponibles
 */
router.get('/disponibles', c.getProfesionalesDisponibles);

/**
 * @openapi
 * /api/perfiles/conductores/disponibles:
 *   get:
 *     tags: [Perfil]
 *     summary: Pilotos disponibles con brevete (alias de profesion=piloto)
 *     parameters:
 *       - in: query
 *         name: fecha
 *         required: true
 *         schema: { type: string, format: date }
 *     responses:
 *       200:
 *         description: Lista de pilotos disponibles
 */
router.get('/conductores/disponibles', c.getConductoresDisponibles);

/**
 * @openapi
 * /api/perfiles/personal:
 *   get:
 *     tags: [Perfil]
 *     summary: Listado de personal con campos según rol y datos relacionados
 *     description: |
 *       Si el usuario asociado tiene rol **cliente**, solo devuelve campos básicos de contacto.
 *       Para cualquier otro rol devuelve el perfil completo.
 *       Incluye brevetes, educación y certificaciones por cada DNI.
 *     parameters:
 *       - in: query
 *         name: nombre
 *         schema: { type: string }
 *         description: Filtrar por nombre (parcial)
 *       - in: query
 *         name: apellido
 *         schema: { type: string }
 *         description: Filtrar por apellido (parcial)
 *       - in: query
 *         name: rol
 *         schema:
 *           type: string
 *           enum: [gerente, cliente, supervisorcampo, asistproy, trabajcampo, abogado, trabajtaller]
 *         description: Filtrar por rol de USUARIO (sin distinguir mayúsculas/acentos)
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 *     responses:
 *       200:
 *         description: Lista de perfiles formateados por rol
 */
router.get('/personal', c.getPersonal);

/**
 * @openapi
 * /api/perfiles/personal/{id}:
 *   get:
 *     tags: [Perfil]
 *     summary: Obtener un perfil con formato personal (por DNI)
 *     description: |
 *       El parámetro **id** es el DNI del perfil.
 *       Misma lógica de campos por rol que GET /api/perfiles/personal.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *         description: DNI del perfil
 *     responses:
 *       200:
 *         description: Perfil formateado por rol con datos relacionados
 *       404:
 *         description: No encontrado
 *   post:
 *     tags: [Perfil]
 *     summary: Crear perfil con DNI del path (formato personal)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *         description: DNI del perfil a crear
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [Nombre, Apellido]
 *             properties:
 *               Nombre: { type: string }
 *               Apellido: { type: string }
 *               Genero: { type: string }
 *               RUC: { type: string }
 *               fecha_nacimiento: { type: string, format: date }
 *               correo_contacto: { type: string }
 *               telefono_contacto: { type: string }
 *               estado_civil: { type: string }
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
 *     responses:
 *       201:
 *         description: Perfil creado con formato personal
 *       409:
 *         description: Ya existe un perfil con ese DNI
 *   put:
 *     tags: [Perfil]
 *     summary: Actualizar perfil por DNI (formato personal)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *         description: DNI del perfil
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               Nombre: { type: string }
 *               Apellido: { type: string }
 *               Genero: { type: string }
 *               RUC: { type: string }
 *               fecha_nacimiento: { type: string, format: date }
 *               correo_contacto: { type: string }
 *               telefono_contacto: { type: string }
 *               estado_civil: { type: string }
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
 *     responses:
 *       200:
 *         description: Perfil actualizado con formato personal
 *       404:
 *         description: No encontrado
 */
router.get('/personal/:id', c.getPersonalById);
router.post('/personal/:id', c.createPersonalById);
router.put('/personal/:id', c.updatePersonalById);

/**
 * @openapi
 * /api/perfiles:
 *   get:
 *     tags: [Perfil]
 *     summary: Listar todos los perfiles
 *     parameters:
 *       - in: query
 *         name: nombre
 *         schema: { type: string }
 *         description: Filtrar por nombre (parcial)
 *       - in: query
 *         name: apellido
 *         schema: { type: string }
 *         description: Filtrar por apellido (parcial)
 *       - in: query
 *         name: rol
 *         schema:
 *           type: string
 *           enum: [gerente, cliente, supervisorcampo, asistproy, trabajcampo, abogado, trabajtaller]
 *         description: Filtrar por rol de USUARIO
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
 *         description: Lista de perfiles con metadatos de paginación (incluye campo rol si tiene usuario)
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
 * /api/perfiles/{dni}/cv:
 *   get:
 *     tags: [Perfil - Documentos]
 *     summary: Descargar o visualizar CV
 *     parameters:
 *       - in: path
 *         name: dni
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Archivo PDF
 *   post:
 *     tags: [Perfil - Documentos]
 *     summary: Subir CV (PDF)
 *     parameters:
 *       - in: path
 *         name: dni
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               cv:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Archivo subido
 */
router.get('/:dni/cv', c.getCV);
router.post('/:dni/cv', uploadPDF.single('cv'), c.uploadCV);

/**
 * @openapi
 * /api/perfiles/{dni}/foto:
 *   get:
 *     tags: [Perfil - Documentos]
 *     summary: Descargar o visualizar foto de perfil
 *     parameters:
 *       - in: path
 *         name: dni
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Archivo de imagen
 *   post:
 *     tags: [Perfil - Documentos]
 *     summary: Subir foto de perfil (Imagen)
 *     parameters:
 *       - in: path
 *         name: dni
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               foto_perfil:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Archivo subido
 */
router.get('/:dni/foto', c.getFotoPerfil);
router.post('/:dni/foto', uploadImage.single('foto_perfil'), c.uploadFotoPerfil);

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
 * /api/perfiles/{dni}/brevetes/{id}/pdf:
 *   get:
 *     tags: [Perfil - Brevete]
 *     summary: Descargar o visualizar PDF del brevete
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
 *         description: Archivo PDF
 *   post:
 *     tags: [Perfil - Brevete]
 *     summary: Subir PDF del brevete
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
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               pdf_brevete:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Archivo subido
 */
router.get('/:dni/brevetes/:id/pdf', c.getBrevetePDF);
router.post('/:dni/brevetes/:id/pdf', uploadPDF.single('pdf_brevete'), c.uploadBrevetePDF);

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
 * /api/perfiles/{dni}/certificaciones/{id}/pdf:
 *   get:
 *     tags: [Perfil - Certificaciones]
 *     summary: Descargar o visualizar PDF de la certificación
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
 *         description: Archivo PDF
 *   post:
 *     tags: [Perfil - Certificaciones]
 *     summary: Subir PDF de la certificación
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
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               pdf_certificacion:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Archivo subido
 */
router.get('/:dni/certificaciones/:id/pdf', c.getCertificacionPDF);
router.post('/:dni/certificaciones/:id/pdf', uploadPDF.single('pdf_certificacion'), c.uploadCertificacionPDF);

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

// ── NUEVAS RUTAS DE RELACIONES Y ASOCIACIONES POR PERFIL ──

/**
 * @openapi
 * /api/perfiles/{dni}/solicitudes:
 *   get:
 *     tags: [Perfil]
 *     summary: Obtener solicitudes de clientes en los que este perfil es contacto
 *     parameters:
 *       - in: path
 *         name: dni
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Lista de solicitudes
 */
router.get('/:dni/solicitudes', c.getSolicitudesPorPerfil);

/**
 * @openapi
 * /api/perfiles/{dni}/cotizaciones:
 *   get:
 *     tags: [Perfil]
 *     summary: Obtener cotizaciones de clientes en los que este perfil es contacto
 *     parameters:
 *       - in: path
 *         name: dni
 *         required: true
 *         schema:
 *           type: string
 *       - $ref: '#/components/parameters/PageQuery'
 *       - $ref: '#/components/parameters/LimitQuery'
 *       - $ref: '#/components/parameters/CotizacionEstadoQuery'
 *       - $ref: '#/components/parameters/CotizacionNombreQuery'
 *     responses:
 *       200:
 *         description: Lista de cotizaciones
 */
router.get('/:dni/cotizaciones', c.getCotizacionesPorPerfil);

/**
 * @openapi
 * /api/perfiles/{dni}/proyectos:
 *   get:
 *     tags: [Perfil]
 *     summary: Obtener proyectos de clientes en los que este perfil es contacto
 *     parameters:
 *       - in: path
 *         name: dni
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Lista de proyectos
 */
router.get('/:dni/proyectos', c.getProyectosPorPerfil);

/**
 * @openapi
 * /api/perfiles/{dni}/incidencias:
 *   get:
 *     tags: [Perfil]
 *     summary: Obtener incidencias de clientes en los que este perfil es contacto
 *     parameters:
 *       - in: path
 *         name: dni
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Lista de incidencias
 */
router.get('/:dni/incidencias', c.getIncidenciasPorPerfil);

/**
 * @openapi
 * /api/perfiles/{dni}/trabajos_jornada:
 *   get:
 *     tags: [Perfil]
 *     summary: Obtener las jornadas de trabajo del perfil
 *     parameters:
 *       - in: path
 *         name: dni
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Lista de jornadas
 */
router.get('/:dni/trabajos_jornada', c.getTrabajosJornadaPorPerfil);

/**
 * @openapi
 * /api/perfiles/{dni}/trabajos_rrhh:
 *   get:
 *     tags: [Perfil]
 *     summary: Obtener los registros de RRHH de trabajo del perfil
 *     parameters:
 *       - in: path
 *         name: dni
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Lista de registros RRHH
 */
router.get('/:dni/trabajos_rrhh', c.getTrabajosRRHHPorPerfil);

/**
 * @openapi
 * /api/perfiles/{dni}/involucrado:
 *   get:
 *     tags: [Perfil]
 *     summary: Obtener los registros donde el perfil es involucrado
 *     parameters:
 *       - in: path
 *         name: dni
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Lista de registros
 */
router.get('/:dni/involucrado', c.getInvolucradoPorPerfil);

/**
 * @openapi
 * /api/perfiles/{dni}/credenciales_rrhh:
 *   get:
 *     tags: [Perfil]
 *     summary: Obtener las credenciales de RRHH del perfil
 *     parameters:
 *       - in: path
 *         name: dni
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Lista de credenciales
 */
router.get('/:dni/credenciales_rrhh', c.getCredencialesRRHHPorPerfil);

/**
 * @openapi
 * /api/perfiles/{dni}/empresas_contacto:
 *   get:
 *     tags: [Perfil]
 *     summary: Obtener las empresas en las que este perfil es contacto
 *     parameters:
 *       - in: path
 *         name: dni
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Lista de empresas
 */
router.get('/:dni/empresas_contacto', c.getEmpresasContactoPorPerfil);

module.exports = router;
