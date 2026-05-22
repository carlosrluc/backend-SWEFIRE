const jwt = require('jsonwebtoken');
const db = require('../config/db');

module.exports = (io) => {
    io.use(async (socket, next) => {
        try {
            console.log(socket.handshake.auth);

            const token = socket.handshake.auth.token;

            console.log("TOKEN:", token);

            const decoded = jwt.verify(
                token,
                process.env.JWT_SECRET
            );

            console.log("DECODED:", decoded);

            socket.user = decoded;

            next();
        } catch (err) {
            console.log("JWT ERROR:", err);

            next(err);
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
            const { id_cotizacion, mensaje, nombre_remitente } = data;

            if (!id_cotizacion || !mensaje) return;

            const tipo_remitente = socket.user.rolNormalizado === 'cliente' ? 'cliente' : 'empleado';

            try {
                const result = await db.query(
                    'INSERT INTO COTIZACION_CHAT_MENSAJE (id_cotizacion, id_remitente, tipo_remitente, nombre_remitente, mensaje) VALUES (?, ?, ?, ?, ?)',
                    [id_cotizacion, socket.user.dni_perfil, tipo_remitente, nombre_remitente || 'Desconocido', mensaje]
                );

                const newMsg = {
                    id_mensaje: result.insertId,
                    id_cotizacion,
                    id_remitente: socket.user.dni_perfil,
                    tipo_remitente,
                    nombre_remitente: nombre_remitente || 'Desconocido',
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
