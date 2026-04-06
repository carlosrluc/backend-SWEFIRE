const router = require('express').Router();
const c = require('../controllers/fabricante.controller');

/**
 * @openapi
 * tags:
 *   - name: Fabricante
 *     description: Gestión de fabricantes
 *   - name: Fabricante - Contactos
 *     description: Contactos del fabricante
 */

/**
 * @openapi
 * /api/fabricantes:
 *   get:
 *     tags: [Fabricante]
 *     summary: Listar todos los fabricantes
 *     responses:
 *       200:
 *         description: Lista de fabricantes
 *   post:
 *     tags: [Fabricante]
 *     summary: Crear un fabricante
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nombre_comercial: { type: string, example: "Proveedor XYZ" }
 *               ubicacion: { type: string }
 *               rubro: { type: string }
 *               descripcion: { type: string }
 *               comentarios: { type: string }
 *               pago: { type: string }
 *     responses:
 *       201:
 *         description: Fabricante creado
 */
router.get('/', c.getAll);
router.post('/', c.create);

/**
 * @openapi
 * /api/fabricantes/{id}:
 *   get:
 *     tags: [Fabricante]
 *     summary: Obtener fabricante por ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Fabricante encontrado
 *       404:
 *         description: No encontrado
 *   put:
 *     tags: [Fabricante]
 *     summary: Actualizar fabricante
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
 *               nombre_comercial: { type: string }
 *               ubicacion: { type: string }
 *               rubro: { type: string }
 *               descripcion: { type: string }
 *               comentarios: { type: string }
 *               pago: { type: string }
 *     responses:
 *       200:
 *         description: Fabricante actualizado
 *   delete:
 *     tags: [Fabricante]
 *     summary: Eliminar fabricante
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Fabricante eliminado
 */
router.get('/:id', c.getById);
router.put('/:id', c.update);
router.delete('/:id', c.remove);

/**
 * @openapi
 * /api/fabricantes/{id}/contactos:
 *   get:
 *     tags: [Fabricante - Contactos]
 *     summary: Listar contactos del fabricante
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Lista de contactos
 *   post:
 *     tags: [Fabricante - Contactos]
 *     summary: Agregar contacto al fabricante
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
 *               persona_contacto: { type: string }
 *               correo_contacto: { type: string }
 *               numero_contacto: { type: string }
 *               anexo_contacto: { type: string }
 *               area_contacto: { type: string }
 *               idioma: { type: string }
 *     responses:
 *       201:
 *         description: Contacto creado
 */
router.get('/:id/contactos', c.getContactos);
router.post('/:id/contactos', c.createContacto);

/**
 * @openapi
 * /api/fabricantes/{id}/contactos/{cid}:
 *   put:
 *     tags: [Fabricante - Contactos]
 *     summary: Actualizar contacto del fabricante
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
 *               persona_contacto: { type: string }
 *               correo_contacto: { type: string }
 *               numero_contacto: { type: string }
 *               area_contacto: { type: string }
 *               idioma: { type: string }
 *     responses:
 *       200:
 *         description: Actualizado
 *   delete:
 *     tags: [Fabricante - Contactos]
 *     summary: Eliminar contacto del fabricante
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
router.put('/:id/contactos/:cid', c.updateContacto);
router.delete('/:id/contactos/:cid', c.deleteContacto);

module.exports = router;
