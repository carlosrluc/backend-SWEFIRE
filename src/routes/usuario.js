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
 *         description: Lista de usuarios con metadatos de paginación
 *   post:
 *     tags: [Usuario]
 *     summary: Crear un usuario
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
 *               nombre: { type: string, example: "Juan" }
 *               apellido: { type: string, example: "Pérez" }
 *     responses:
 *       201:
 *         description: Usuario creado
 */
router.get('/', c.getAll);
router.post('/', c.create);

/**
 * @openapi
 * /api/usuarios/login:
 *   post:
 *     tags: [Usuario]
 *     summary: Iniciar sesión (verifica contraseña con bcrypt)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [correo, contrasena]
 *             properties:
 *               correo:    { type: string, example: "usuario@email.com" }
 *               contrasena: { type: string, example: "secret123" }
 *     responses:
 *       200:
 *         description: Login exitoso, retorna datos del usuario sin la contraseña
 *       401:
 *         description: Credenciales inválidas
 */
router.post('/login', c.login);

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

module.exports = router;
