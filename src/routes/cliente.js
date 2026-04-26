const router = require('express').Router();
const c = require('../controllers/cliente.controller');

/**
 * @openapi
 * tags:
 *   - name: Cliente
 *     description: Gestión de clientes
 *   - name: Cliente - Contactos
 *     description: Contactos del cliente
 *   - name: Cliente - Teléfonos Móviles
 *     description: Teléfonos móviles del cliente
 *   - name: Cliente - Correos
 *     description: Correos del cliente
 *   - name: Cliente - Teléfonos Fijos
 *     description: Teléfonos fijos del cliente
 */

/**
 * @openapi
 * /api/clientes:
 *   get:
 *     tags: [Cliente]
 *     summary: Listar todos los clientes
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
 *         description: Lista de clientes con metadatos de paginación
 *   post:
 *     tags: [Cliente]
 *     summary: Crear un cliente
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [DNI_O_RUC]
 *             properties:
 *               DNI_O_RUC: { type: string, example: "20512345678" }
 *               nombre_comercial: { type: string, example: "Empresa ABC" }
 *               razon_social: { type: string }
 *               rubro: { type: string }
 *               ubicacion_facturacion: { type: string }
 *               observacion: { type: string }
 *     responses:
 *       201:
 *         description: Cliente creado
 */
router.get('/', c.getAll);
router.post('/', c.create);

/**
 * @openapi
 * /api/clientes/{id}:
 *   get:
 *     tags: [Cliente]
 *     summary: Obtener cliente por DNI/RUC
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *         description: DNI o RUC del cliente
 *     responses:
 *       200:
 *         description: Cliente encontrado
 *       404:
 *         description: No encontrado
 *   put:
 *     tags: [Cliente]
 *     summary: Actualizar cliente
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nombre_comercial: { type: string }
 *               razon_social: { type: string }
 *               rubro: { type: string }
 *               ubicacion_facturacion: { type: string }
 *               observacion: { type: string }
 *     responses:
 *       200:
 *         description: Cliente actualizado
 *   delete:
 *     tags: [Cliente]
 *     summary: Eliminar cliente
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Cliente eliminado
 */
router.get('/:id', c.getById);
router.put('/:id', c.update);
router.delete('/:id', c.remove);

/**
 * @openapi
 * /api/clientes/{id}/contactos:
 *   get:
 *     tags: [Cliente - Contactos]
 *     summary: Listar contactos del cliente
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Lista de contactos
 *   post:
 *     tags: [Cliente - Contactos]
 *     summary: Agregar contacto al cliente
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               DNI_perfil: { type: string }
 *               cargo_en_empresa: { type: string }
 *               lugar_trabajo: { type: string }
 *     responses:
 *       201:
 *         description: Contacto creado
 */
router.get('/:id/contactos', c.getContactos);
router.post('/:id/contactos', c.createContacto);

/**
 * @openapi
 * /api/clientes/{id}/contactos/{cid}:
 *   put:
 *     tags: [Cliente - Contactos]
 *     summary: Actualizar contacto del cliente
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
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
 *               DNI_perfil: { type: string }
 *               cargo_en_empresa: { type: string }
 *               lugar_trabajo: { type: string }
 *     responses:
 *       200:
 *         description: Actualizado
 *   delete:
 *     tags: [Cliente - Contactos]
 *     summary: Eliminar contacto del cliente
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
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

/**
 * @openapi
 * /api/clientes/{id}/telefonos-movil:
 *   get:
 *     tags: [Cliente - Teléfonos Móviles]
 *     summary: Listar teléfonos móviles del cliente
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Lista de teléfonos móviles
 *   post:
 *     tags: [Cliente - Teléfonos Móviles]
 *     summary: Agregar teléfono móvil al cliente
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               telefono: { type: string, example: "987654321" }
 *               persona: { type: string }
 *     responses:
 *       201:
 *         description: Teléfono creado
 */
router.get('/:id/telefonos-movil', c.getTelefonosMovil);
router.post('/:id/telefonos-movil', c.createTelefonoMovil);

/**
 * @openapi
 * /api/clientes/{id}/telefonos-movil/{cid}:
 *   delete:
 *     tags: [Cliente - Teléfonos Móviles]
 *     summary: Eliminar teléfono móvil
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: cid
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Eliminado
 */
router.delete('/:id/telefonos-movil/:cid', c.deleteTelefonoMovil);

/**
 * @openapi
 * /api/clientes/{id}/correos:
 *   get:
 *     tags: [Cliente - Correos]
 *     summary: Listar correos del cliente
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Lista de correos
 *   post:
 *     tags: [Cliente - Correos]
 *     summary: Agregar correo al cliente
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               correo: { type: string, example: "ventas@empresa.com" }
 *               rama: { type: string }
 *     responses:
 *       201:
 *         description: Correo creado
 */
router.get('/:id/correos', c.getCorreos);
router.post('/:id/correos', c.createCorreo);

/**
 * @openapi
 * /api/clientes/{id}/correos/{cid}:
 *   delete:
 *     tags: [Cliente - Correos]
 *     summary: Eliminar correo del cliente
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: cid
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Eliminado
 */
router.delete('/:id/correos/:cid', c.deleteCorreo);

/**
 * @openapi
 * /api/clientes/{id}/telefonos-fijo:
 *   get:
 *     tags: [Cliente - Teléfonos Fijos]
 *     summary: Listar teléfonos fijos del cliente
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Lista de teléfonos fijos
 *   post:
 *     tags: [Cliente - Teléfonos Fijos]
 *     summary: Agregar teléfono fijo al cliente
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               numero: { type: string }
 *               anexo: { type: string }
 *               descripcion_anexo: { type: string }
 *     responses:
 *       201:
 *         description: Teléfono fijo creado
 */
router.get('/:id/telefonos-fijo', c.getTelefonosFijo);
router.post('/:id/telefonos-fijo', c.createTelefonoFijo);

/**
 * @openapi
 * /api/clientes/{id}/telefonos-fijo/{cid}:
 *   delete:
 *     tags: [Cliente - Teléfonos Fijos]
 *     summary: Eliminar teléfono fijo del cliente
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: cid
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Eliminado
 */
router.delete('/:id/telefonos-fijo/:cid', c.deleteTelefonoFijo);

/**
 * @openapi
 * /api/clientes/{id}/solicitudes:
 *   get:
 *     tags: [Cliente]
 *     summary: Obtener solicitudes del cliente
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Lista de solicitudes
 */
router.get('/:id/solicitudes', c.getSolicitudes);

/**
 * @openapi
 * /api/clientes/{id}/cotizaciones:
 *   get:
 *     tags: [Cliente]
 *     summary: Obtener cotizaciones del cliente
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Lista de cotizaciones
 */
router.get('/:id/cotizaciones', c.getCotizaciones);

/**
 * @openapi
 * /api/clientes/{id}/proyectos:
 *   get:
 *     tags: [Cliente]
 *     summary: Obtener proyectos del cliente
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Lista de proyectos
 */
router.get('/:id/proyectos', c.getProyectos);

/**
 * @openapi
 * /api/clientes/{id}/incidencias:
 *   get:
 *     tags: [Cliente]
 *     summary: Obtener incidencias del cliente
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Lista de incidencias
 */
router.get('/:id/incidencias', c.getIncidencias);

module.exports = router;
