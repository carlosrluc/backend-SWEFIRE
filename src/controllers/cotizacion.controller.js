const db = require('../config/db');

// ── COTIZACION_COMERCIAL ──────────────────────────────────────────────────────
exports.getAll = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;

        let query = 'SELECT C_C.*, C.nombre_comercial as Cliente_Nombre FROM COTIZACION_COMERCIAL C_C LEFT JOIN CLIENTE C ON C_C.DNI_O_RUC = C.DNI_O_RUC';
        let countQuery = 'SELECT COUNT(*) as total FROM COTIZACION_COMERCIAL C_C';
        let args = [];
        let countArgs = [];

        if (req.user && req.user.rolNormalizado === 'cliente') {
            const condition = ' WHERE C_C.DNI_O_RUC = ? OR C_C.id_solicitud IN (SELECT ID FROM SOLICITUD WHERE Id_Cliente = ?)';
            query += condition;
            countQuery += condition;
            args.push(req.user.dni_perfil, req.user.dni_perfil);
            countArgs.push(req.user.dni_perfil, req.user.dni_perfil);
        }

        query += ' LIMIT ? OFFSET ?';
        args.push(limit, offset);

        const rows = await db.query(query, args);
        const countResult = await db.query(countQuery, countArgs);
        const total = countResult[0].total;

        res.json({
            data: rows,
            pagination: { total, page, limit, totalPages: Math.ceil(total / limit) }
        });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.getById = async (req, res) => {
    try {
        let query = 'SELECT C_C.*, C.nombre_comercial as Cliente_Nombre FROM COTIZACION_COMERCIAL C_C LEFT JOIN CLIENTE C ON C_C.DNI_O_RUC = C.DNI_O_RUC WHERE C_C.ID = ?';
        let args = [req.params.id];

        if (req.user && req.user.rolNormalizado === 'cliente') {
            query += ' AND (C_C.DNI_O_RUC = ? OR C_C.id_solicitud IN (SELECT ID FROM SOLICITUD WHERE Id_Cliente = ?))';
            args.push(req.user.dni_perfil, req.user.dni_perfil);
        }

        const rows = await db.query(query, args);
        if (!rows.length) return res.status(404).json({ error: 'No encontrado o sin permiso' });
        res.json(rows[0]);
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.getDetalles = async (req, res) => {
    try {
        const cotizacionId = req.params.id;

        // Validar permisos si es cliente
        if (req.user && req.user.rolNormalizado === 'cliente') {
            const check = await db.query(
                'SELECT ID FROM COTIZACION_COMERCIAL WHERE ID = ? AND (DNI_O_RUC = ? OR id_solicitud IN (SELECT ID FROM SOLICITUD WHERE Id_Cliente = ?))',
                [cotizacionId, req.user.dni_perfil, req.user.dni_perfil]
            );
            if (!check.length) return res.status(403).json({ error: 'No tienes permiso para ver esta cotización' });
        }

        // Obtener datos base de la cotización comercial
        const baseQuery = 'SELECT comentario_cliente, fecha_emision, fecha_vigencia, observacion FROM COTIZACION_COMERCIAL WHERE ID = ?';
        const baseResult = await db.query(baseQuery, [cotizacionId]);
        if (!baseResult.length) return res.status(404).json({ error: 'Cotización no encontrada' });

        const cotizacionBase = baseResult[0];

        // Obtener inventario
        const invQuery = `
            SELECT 
                c.ID_Inventario AS id, 
                i.nombre_objeto AS nombre_producto, 
                c.cantidad, 
                c.precio_comercial AS precio_unitario, 
                c.intencion 
            FROM COTIZACION_INVENTARIO c 
            LEFT JOIN INVENTARIO i ON c.ID_Inventario = i.Id_Objeto 
            WHERE c.ID_Cotizacion = ?`;
        const inventarioResult = await db.query(invQuery, [cotizacionId]);

        // Obtener camiones
        const camQuery = `
            SELECT 
                c.Placa as placa, 
                p.Nombre as nombre_piloto 
            FROM COTIZACION_CAMION c 
            LEFT JOIN USUARIO u ON c.ID_Piloto = u.idusuario 
            LEFT JOIN PERFIL p ON u.dni_perfil = p.DNI 
            WHERE c.ID_Cotizacion = ?`;
        const camionesResult = await db.query(camQuery, [cotizacionId]);

        // Obtener servicios
        // Nota: se agregó 'NULL as placa' por requerimiento especificado, aunque no exista en los servicios
        const servQuery = `
            SELECT 
                NULL as placa,
                c.fecha_inicio, 
                c.fecha_finalizacion, 
                c.precio_comercial, 
                s.nombre as nombre_servicio 
            FROM COTIZACION_SERVICIO c 
            LEFT JOIN SERVICIO s ON c.ID_Servicio = s.ID_Servicio 
            WHERE c.ID_Cotizacion = ?`;
        const serviciosResult = await db.query(servQuery, [cotizacionId]);

        res.json({
            comentario_cliente: cotizacionBase.comentario_cliente,
            fecha_emision: cotizacionBase.fecha_emision,
            fecha_vigencia: cotizacionBase.fecha_vigencia,
            observacion: cotizacionBase.observacion,
            inventario: inventarioResult,
            camiones: camionesResult,
            servicios: serviciosResult
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

exports.create = async (req, res) => {
    const { version, nombre, id_solicitud, DNI_O_RUC, precio_total, estado, comentario_cliente } = req.body;
    try {
        const [result] = await db.query(
            'INSERT INTO COTIZACION_COMERCIAL (version,nombre,id_solicitud,DNI_O_RUC,precio_total,estado,comentario_cliente) VALUES (?,?,?,?,?,?,?)',
            [version, nombre, id_solicitud, DNI_O_RUC, precio_total, estado, comentario_cliente]
        );
        res.status(201).json({ message: 'Cotización creada', ID: result.insertId });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.update = async (req, res) => {
    const { version, nombre, id_solicitud, DNI_O_RUC, precio_total, estado, comentario_cliente } = req.body;
    try {
        if (req.user && req.user.rolNormalizado === 'cliente') {
            const check = await db.query(
                'SELECT ID FROM COTIZACION_COMERCIAL WHERE ID = ? AND (DNI_O_RUC = ? OR id_solicitud IN (SELECT ID FROM SOLICITUD WHERE Id_Cliente = ?))',
                [req.params.id, req.user.dni_perfil, req.user.dni_perfil]
            );
            if (!check.length) return res.status(403).json({ error: 'No tienes permiso para editar esta cotización' });
        }

        const [result] = await db.query(
            'UPDATE COTIZACION_COMERCIAL SET version=?,nombre=?,id_solicitud=?,DNI_O_RUC=?,precio_total=?,estado=?,comentario_cliente=? WHERE ID=?',
            [version, nombre, id_solicitud, DNI_O_RUC, precio_total, estado, comentario_cliente, req.params.id]
        );
        if (result.affectedRows === 0) return res.status(404).json({ error: 'No encontrado' });
        res.json({ message: 'Cotización actualizada' });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.remove = async (req, res) => {
    try {
        const [result] = await db.query('DELETE FROM COTIZACION_COMERCIAL WHERE ID = ?', [req.params.id]);
        if (result.affectedRows === 0) return res.status(404).json({ error: 'No encontrado' });
        res.json({ message: 'Cotización eliminada' });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

// ── COTIZACION_SERVICIO ───────────────────────────────────────────────────────
exports.getServicios = async (req, res) => {
    try { res.json(await db.query('SELECT CS.*, S.nombre as Servicio_Nombre FROM COTIZACION_SERVICIO CS LEFT JOIN SERVICIO S ON CS.ID_Servicio = S.ID_Servicio WHERE CS.ID_Cotizacion = ?', [req.params.id])); }
    catch (e) { res.status(500).json({ error: e.message }); }
};

exports.createServicio = async (req, res) => {
    const { ID_Servicio, fecha_inicio, fecha_finalizacion, jornada, precio_comercial, ubicacion } = req.body;
    try {
        const [result] = await db.query(
            'INSERT INTO COTIZACION_SERVICIO (ID_Cotizacion,ID_Servicio,fecha_inicio,fecha_finalizacion,jornada,precio_comercial,ubicacion) VALUES (?,?,?,?,?,?,?)',
            [req.params.id, ID_Servicio, fecha_inicio, fecha_finalizacion, jornada, precio_comercial, ubicacion]
        );
        res.status(201).json({ message: 'Servicio en cotización creado', id: result.insertId });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.updateServicio = async (req, res) => {
    const { ID_Servicio, fecha_inicio, fecha_finalizacion, jornada, precio_comercial, ubicacion } = req.body;
    try {
        const [result] = await db.query(
            'UPDATE COTIZACION_SERVICIO SET ID_Servicio=?, fecha_inicio=?, fecha_finalizacion=?, jornada=?, precio_comercial=?, ubicacion=? WHERE id=? AND ID_Cotizacion=?',
            [ID_Servicio, fecha_inicio, fecha_finalizacion, jornada, precio_comercial, ubicacion, req.params.sid, req.params.id]
        );
        if (result.affectedRows === 0) return res.status(404).json({ error: 'No encontrado' });
        res.json({ message: 'Servicio en cotización actualizado' });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.deleteServicio = async (req, res) => {
    try {
        const [result] = await db.query(
            'DELETE FROM COTIZACION_SERVICIO WHERE id=? AND ID_Cotizacion=?', [req.params.sid, req.params.id]
        );
        if (result.affectedRows === 0) return res.status(404).json({ error: 'No encontrado' });
        res.json({ message: 'Servicio en cotización eliminado' });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

// ── COTIZACION_CAMION ─────────────────────────────────────────────────────────
exports.getCamiones = async (req, res) => {
    try { res.json(await db.query('SELECT CC.*, C.nombre as Camion_Nombre, P.Nombre as Piloto_Nombre, P.Apellido as Piloto_Apellido FROM COTIZACION_CAMION CC LEFT JOIN CAMION C ON CC.Placa = C.Placa LEFT JOIN USUARIO U ON CC.ID_Piloto = U.idusuario LEFT JOIN PERFIL P ON U.dni_perfil = P.DNI WHERE CC.ID_Cotizacion = ?', [req.params.id])); }
    catch (e) { res.status(500).json({ error: e.message }); }
};

exports.createCamion = async (req, res) => {
    const { Placa, uso, fecha_hora_entrada, fecha_hora_salida, ID_Piloto, preciounit } = req.body;
    try {
        const [result] = await db.query(
            'INSERT INTO COTIZACION_CAMION (ID_Cotizacion,Placa,uso,fecha_hora_entrada,fecha_hora_salida,ID_Piloto,preciounit) VALUES (?,?,?,?,?,?,?)',
            [req.params.id, Placa, uso, fecha_hora_entrada, fecha_hora_salida, ID_Piloto, preciounit]
        );
        res.status(201).json({ message: 'Camión en cotización creado', id: result.insertId });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.updateCamion = async (req, res) => {
    const { Placa, uso, fecha_hora_entrada, fecha_hora_salida, ID_Piloto, preciounit } = req.body;
    try {
        const [result] = await db.query(
            'UPDATE COTIZACION_CAMION SET Placa=?, uso=?, fecha_hora_entrada=?, fecha_hora_salida=?, ID_Piloto=?, preciounit=? WHERE id=? AND ID_Cotizacion=?',
            [Placa, uso, fecha_hora_entrada, fecha_hora_salida, ID_Piloto, preciounit, req.params.cid, req.params.id]
        );
        if (result.affectedRows === 0) return res.status(404).json({ error: 'No encontrado' });
        res.json({ message: 'Camión en cotización actualizado' });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.deleteCamion = async (req, res) => {
    try {
        const [result] = await db.query(
            'DELETE FROM COTIZACION_CAMION WHERE id=? AND ID_Cotizacion=?', [req.params.cid, req.params.id]
        );
        if (result.affectedRows === 0) return res.status(404).json({ error: 'No encontrado' });
        res.json({ message: 'Camión en cotización eliminado' });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

// ── COTIZACION_INVENTARIO ─────────────────────────────────────────────────────
exports.getInventario = async (req, res) => {
    try { res.json(await db.query('SELECT CI.*, I.nombre_objeto as Objeto_Nombre FROM COTIZACION_INVENTARIO CI LEFT JOIN INVENTARIO I ON CI.ID_Inventario = I.Id_Objeto WHERE CI.ID_Cotizacion = ?', [req.params.id])); }
    catch (e) { res.status(500).json({ error: e.message }); }
};

exports.createInventario = async (req, res) => {
    const { ID_Inventario, cantidad, intencion, dias_alquilados, precio_comercial, costo_comercial, fecha_salida_taller, fecha_ingreso_taller, observaciones } = req.body;
    try {
        const [result] = await db.query(
            'INSERT INTO COTIZACION_INVENTARIO (ID_Cotizacion,ID_Inventario,cantidad,intencion,dias_alquilados,precio_comercial,costo_comercial,fecha_salida_taller,fecha_ingreso_taller,observaciones) VALUES (?,?,?,?,?,?,?,?,?,?)',
            [req.params.id, ID_Inventario, cantidad, intencion, dias_alquilados, precio_comercial, costo_comercial, fecha_salida_taller, fecha_ingreso_taller, observaciones]
        );
        res.status(201).json({ message: 'Inventario en cotización creado', id: result.insertId });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.updateInventario = async (req, res) => {
    const { ID_Inventario, cantidad, intencion, dias_alquilados, precio_comercial, costo_comercial, fecha_salida_taller, fecha_ingreso_taller, observaciones } = req.body;
    try {
        const [result] = await db.query(
            'UPDATE COTIZACION_INVENTARIO SET ID_Inventario=?, cantidad=?, intencion=?, dias_alquilados=?, precio_comercial=?, costo_comercial=?, fecha_salida_taller=?, fecha_ingreso_taller=?, observaciones=? WHERE id=? AND ID_Cotizacion=?',
            [ID_Inventario, cantidad, intencion, dias_alquilados, precio_comercial, costo_comercial, fecha_salida_taller, fecha_ingreso_taller, observaciones, req.params.iid, req.params.id]
        );
        if (result.affectedRows === 0) return res.status(404).json({ error: 'No encontrado' });
        res.json({ message: 'Inventario en cotización actualizado' });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.deleteInventario = async (req, res) => {
    try {
        const [result] = await db.query(
            'DELETE FROM COTIZACION_INVENTARIO WHERE id=? AND ID_Cotizacion=?', [req.params.iid, req.params.id]
        );
        if (result.affectedRows === 0) return res.status(404).json({ error: 'No encontrado' });
        res.json({ message: 'Inventario en cotización eliminado' });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

// ── COTIZACION_PERSONAL ───────────────────────────────────────────────────────
exports.getPersonal = async (req, res) => {
    try { res.json(await db.query('SELECT CP.*, P.Nombre as Personal_Nombre, P.Apellido as Personal_Apellido FROM COTIZACION_PERSONAL CP LEFT JOIN USUARIO U ON CP.ID_Usuario = U.idusuario LEFT JOIN PERFIL P ON U.dni_perfil = P.DNI WHERE CP.ID_Cotizacion = ?', [req.params.id])); }
    catch (e) { res.status(500).json({ error: e.message }); }
};

exports.createPersonal = async (req, res) => {
    const { ID_Usuario, rol_en_trabajo, fecha_entrada, fecha_salida, dias_trabajados } = req.body;
    try {
        const [result] = await db.query(
            'INSERT INTO COTIZACION_PERSONAL (ID_Cotizacion,ID_Usuario,rol_en_trabajo,fecha_entrada,fecha_salida,dias_trabajados) VALUES (?,?,?,?,?,?)',
            [req.params.id, ID_Usuario, rol_en_trabajo, fecha_entrada, fecha_salida, dias_trabajados]
        );
        res.status(201).json({ message: 'Personal en cotización creado', id: result.insertId });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.updatePersonal = async (req, res) => {
    const { ID_Usuario, rol_en_trabajo, fecha_entrada, fecha_salida, dias_trabajados } = req.body;
    try {
        const [result] = await db.query(
            'UPDATE COTIZACION_PERSONAL SET ID_Usuario=?, rol_en_trabajo=?, fecha_entrada=?, fecha_salida=?, dias_trabajados=? WHERE id=? AND ID_Cotizacion=?',
            [ID_Usuario, rol_en_trabajo, fecha_entrada, fecha_salida, dias_trabajados, req.params.pid, req.params.id]
        );
        if (result.affectedRows === 0) return res.status(404).json({ error: 'No encontrado' });
        res.json({ message: 'Personal en cotización actualizado' });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.deletePersonal = async (req, res) => {
    try {
        const [result] = await db.query(
            'DELETE FROM COTIZACION_PERSONAL WHERE id=? AND ID_Cotizacion=?', [req.params.pid, req.params.id]
        );
        if (result.affectedRows === 0) return res.status(404).json({ error: 'No encontrado' });
        res.json({ message: 'Personal en cotización eliminado' });
    } catch (e) { res.status(500).json({ error: e.message }); }
};
