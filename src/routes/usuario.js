const router = require('express').Router();
const c = require('../controllers/usuario.controller');

/**
 * @openapi
 * tags:
 *   - name: Usuario
 *     description: Gestión de usuarios del sistema
 */

/**
 * @openapi
 * /api/usuarios:
 *   get:
 *     tags: [Usuario]
 *     summary: Listar todos los usuarios
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
 *         description: Lista de usuarios (sin contraseña)
 *   post:
 *     tags: [Usuario]
 *     summary: Crear un usuario
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [dni_perfil, contrasena, correo]
 *             properties:
 *               dni_perfil: { type: string, example: "12345678" }
 *               rol: { type: string, example: "admin" }
 *               contrasena: { type: string, example: "secret123" }
 *               correo: { type: string, example: "usuario@email.com" }
 *               temp_pass_unhashed: { type: string, example: "secret123" }
 *     responses:
 *       201:
 *         description: Usuario creado (requiere que el perfil con dni_perfil ya exista)
 *       400:
 *         description: Perfil inexistente o datos inválidos
 */
router.get('/', c.getAll);
router.post('/', c.create);

/**
 * @openapi
 * /api/usuarios/con-perfil:
 *   post:
 *     tags: [Usuario]
 *     summary: Crear usuario y perfil (registro cliente)
 *     security: []
 *     description: |
 *       Crea un registro en PERFIL y otro en USUARIO en una sola operación.
 *       El objeto **perfil** (o **cliente**) solo admite campos de contacto del perfil.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [dni_perfil, contrasena, correo, perfil]
 *             properties:
 *               dni_perfil: { type: string, example: "12345678" }
 *               rol: { type: string, example: "cliente" }
 *               contrasena: { type: string, example: "secret123" }
 *               correo: { type: string, example: "usuario@email.com" }
 *               perfil:
 *                 type: object
 *                 required: [Nombre, Apellido]
 *                 description: Solo estos campos de la tabla PERFIL
 *                 properties:
 *                   Nombre: { type: string }
 *                   Apellido: { type: string }
 *                   correo_contacto: { type: string }
 *                   telefono_contacto: { type: string }
 *                   distrito_residencia: { type: string, description: "También acepta distrito_recidencia" }
 *                   profesion: { type: string }
 *     responses:
 *       201:
 *         description: Usuario y perfil creados
 *       400:
 *         description: Datos inválidos
 *       409:
 *         description: DNI o correo ya registrado
 */
router.post('/con-perfil', c.createWithPerfil);

/**
 * @openapi
 * /api/usuarios/{id}:
 *   get:
 *     tags: [Usuario]
 *     summary: Obtener usuario por ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Usuario encontrado
 *       404:
 *         description: No encontrado
 *   put:
 *     tags: [Usuario]
 *     summary: Actualizar usuario
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
 *               dni_perfil: { type: string }
 *               rol: { type: string }
 *               contrasena: { type: string }
 *               correo: { type: string }
 *               temp_pass_unhashed: { type: string }
 *     responses:
 *       200:
 *         description: Usuario actualizado
 *   delete:
 *     tags: [Usuario]
 *     summary: Eliminar usuario
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Usuario eliminado
 */
router.get('/:id', c.getById);
router.put('/:id', c.update);
router.delete('/:id', c.remove);

/**
 * @openapi
 * /api/usuarios/login:
 *   post:
 *     tags: [Usuario]
 *     summary: Iniciar sesión
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [correo, contrasena]
 *             properties:
 *               correo: { type: string, example: "usuario@email.com" }
 *               contrasena: { type: string, example: "secret123" }
 *     responses:
 *       200:
 *         description: Login exitoso, retorna token JWT
 *       401:
 *         description: Credenciales inválidas
 */
router.post('/login', c.login);

/**
 * @openapi
 * /api/usuarios/temp-pass/{correo}:
 *   get:
 *     tags: [Usuario]
 *     summary: Obtener la contraseña en texto plano (TEMPORAL PARA FRONTEND)
 *     description: Retorna la contraseña sin hashear usada en la creación. Este endpoint será removido en el futuro.
 *     parameters:
 *       - in: path
 *         name: correo
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Contraseña deshasheada devuelta exitosamente
 *       404:
 *         description: Usuario no encontrado
 */
router.get('/temp-pass/:correo', c.getTempPassword);

module.exports = router;
