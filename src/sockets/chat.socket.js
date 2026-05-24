const jwt = require('jsonwebtoken');
const db = require('../config/db');

module.exports = (io) => {
    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth.token;
            if (!token) return next(new Error('Authentication error: Token missing'));

            const JWT_SECRET = process.env.JWT_SECRET || 'secret_key_swefire';
            const decoded = jwt.verify(token, JWT_SECRET);
            socket.user = decoded;
            console.log(`[Socket] Token verificado correctamente. Usuario: ${decoded.dni_perfil}`);
            next();
        } catch (err) {
            console.error("\n[ERROR DE SOCKET] Fallo al verificar el token:", err.message);
            next(new Error('Authentication error: Invalid token'));
        }
    });

    io.on('connection', (socket) => {
        console.log(`[Socket] Usuario conectado al chat: ${socket.user.dni_perfil}`);

        socket.on('join_room', async (cotizacionId) => {
            if (socket.user.rolNormalizado === 'cliente') {
                try {
                    const contactos = await db.query('SELECT DNI_O_RUC FROM CLIENTE_CONTACTO WHERE DNI_perfil = ?', [socket.user.dni_perfil]);
                    const clientIds = contactos.map(c => c.DNI_O_RUC);
                    clientIds.push(socket.user.dni_perfil);

                    const placeholders = clientIds.map(() => '?').join(',');
                    const check = await db.query(
                        `SELECT ID FROM COTIZACION_COMERCIAL WHERE ID = ? AND (DNI_O_RUC IN (${placeholders}) OR id_solicitud IN (SELECT ID FROM SOLICITUD WHERE Id_Cliente IN (${placeholders})))`,
                        [cotizacionId, ...clientIds, ...clientIds]
                    );
                    if (!check.length) {
                        return socket.emit('error', 'No tienes permiso para entrar a esta sala');
                    }
                } catch (e) {
                    return socket.emit('error', 'Error verificando permisos');
                }
            }

            socket.join(cotizacionId);
            console.log(`[Socket] Usuario ${socket.user.dni_perfil} se unió a la sala cotizacion_${cotizacionId}`);
        });

        socket.on('send_message', async (data) => {
            const { id_cotizacion, mensaje } = data;

            if (!id_cotizacion || !mensaje) return;

            try {
                // 1. Obtener id_cliente (DNI_O_RUC de COTIZACION_COMERCIAL)
                const cotizaciones = await db.query('SELECT DNI_O_RUC FROM COTIZACION_COMERCIAL WHERE ID = ?', [id_cotizacion]);
                if (!cotizaciones || cotizaciones.length === 0) {
                    return socket.emit('error', 'Cotización no encontrada');
                }
                const id_cliente = cotizaciones[0].DNI_O_RUC;

                // 2. Obtener Nombre y Apellido del remitente
                const perfiles = await db.query('SELECT Nombre, Apellido FROM PERFIL WHERE DNI = ?', [socket.user.dni_perfil]);
                let nombre_remitente = 'Desconocido';
                if (perfiles && perfiles.length > 0) {
                    nombre_remitente = `${perfiles[0].Nombre} ${perfiles[0].Apellido}`;
                }

                // 3. Obtener el rol exacto de la sesión
                const tipo_remitente = socket.user.rol || 'Desconocido';

                const result = await db.query(
                    'INSERT INTO COTIZACION_CHAT_MENSAJE (id_cotizacion, id_remitente, id_cliente, tipo_remitente, nombre_remitente, mensaje) VALUES (?, ?, ?, ?, ?, ?)',
                    [id_cotizacion, socket.user.dni_perfil, id_cliente, tipo_remitente, nombre_remitente, mensaje]
                );

                const newMsg = {
                    id_mensaje: result.insertId,
                    id_cotizacion,
                    id_remitente: socket.user.dni_perfil,
                    id_cliente,
                    tipo_remitente,
                    nombre_remitente,
                    mensaje,
                    fecha_hora: new Date()
                };

                // Emitir a todos en la sala
                io.to(id_cotizacion).emit('receive_message', newMsg);
            } catch (err) {
                console.error("Error al guardar mensaje: ", err);
                socket.emit('error', 'Error interno al enviar el mensaje');
            }
        });

        socket.on('disconnect', () => {
            console.log(`[Socket] Usuario desconectado: ${socket.user.dni_perfil}`);
        });
    });
};
