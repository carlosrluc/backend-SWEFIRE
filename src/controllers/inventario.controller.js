const db = require('../config/db');
const { withTx, getInventarioCantidad } = require('../services/inventarioStock.service');
const { createMovimiento } = require('../services/inventarioMovimiento.service');

// ── INVENTARIO ────────────────────────────────────────────────────────────────
exports.getAll = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;

        const rows = await db.query(
            `SELECT I.*, F.nombre_comercial as Fabricante_Nombre 
             FROM INVENTARIO I 
             LEFT JOIN FABRICANTE F ON I.ID_Fabricante = F.ID_Fabricante 
             LIMIT ? OFFSET ?`,
            [limit, offset]
        );

        const countResult = await db.query('SELECT COUNT(*) as total FROM INVENTARIO');
        const total = countResult[0].total;

        res.json({
            data: rows,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.getById = async (req, res) => {
    try {
        const rows = await db.query(
            `SELECT I.*, F.nombre_comercial as Fabricante_Nombre 
             FROM INVENTARIO I 
             LEFT JOIN FABRICANTE F ON I.ID_Fabricante = F.ID_Fabricante 
             WHERE I.Id_Objeto = ?`, 
            [req.params.id]
        );
        if (!rows.length) return res.status(404).json({ error: 'No encontrado' });
        res.json(rows[0]);
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.create = async (req, res) => {
    const { lugar_almacenaje, cantidad, nombre_objeto, ID_Fabricante, orden_compra,
        fecha_compra, factura, garantia, numero_serial, ano_fabricacion, peso,
        estado, precio_compra, precio_envio, responsable_envio, precio_comercial,
        mant_requerimiento, mant_ultimo, mant_fecha_caducidad, mant_responsable, mant_contacto } = req.body;
    try {
        const result = await db.query(
            `INSERT INTO INVENTARIO (lugar_almacenaje,cantidad,nombre_objeto,ID_Fabricante,orden_compra,
             fecha_compra,factura,garantia,numero_serial,ano_fabricacion,peso,estado,precio_compra,
             precio_envio,responsable_envio,precio_comercial,mant_requerimiento,mant_ultimo,
             mant_fecha_caducidad,mant_responsable,mant_contacto)
             VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
            [lugar_almacenaje, cantidad, nombre_objeto, ID_Fabricante, orden_compra,
             fecha_compra, factura, garantia, numero_serial, ano_fabricacion, peso,
             estado, precio_compra, precio_envio, responsable_envio, precio_comercial,
             mant_requerimiento, mant_ultimo, mant_fecha_caducidad, mant_responsable, mant_contacto]
        );
        res.status(201).json({ message: 'Inventario creado', Id_Objeto: result.insertId });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.update = async (req, res) => {
    const { lugar_almacenaje, cantidad, nombre_objeto, ID_Fabricante, orden_compra,
        fecha_compra, factura, garantia, numero_serial, ano_fabricacion, peso,
        estado, precio_compra, precio_envio, responsable_envio, precio_comercial,
        mant_requerimiento, mant_ultimo, mant_fecha_caducidad, mant_responsable, mant_contacto,
        razon } = req.body;
    try {
        const Id_Objeto = Number(req.params.id);

        const out = await withTx(db, async (conn) => {
            const antes = await getInventarioCantidad(conn, Id_Objeto);

            const result = await conn.query(
                `UPDATE INVENTARIO SET lugar_almacenaje=?,cantidad=?,nombre_objeto=?,ID_Fabricante=?,orden_compra=?,
                 fecha_compra=?,factura=?,garantia=?,numero_serial=?,ano_fabricacion=?,peso=?,estado=?,precio_compra=?,
                 precio_envio=?,responsable_envio=?,precio_comercial=?,mant_requerimiento=?,mant_ultimo=?,
                 mant_fecha_caducidad=?,mant_responsable=?,mant_contacto=? WHERE Id_Objeto=?`,
                [lugar_almacenaje, cantidad, nombre_objeto, ID_Fabricante, orden_compra,
                 fecha_compra, factura, garantia, numero_serial, ano_fabricacion, peso,
                 estado, precio_compra, precio_envio, responsable_envio, precio_comercial,
                 mant_requerimiento, mant_ultimo, mant_fecha_caducidad, mant_responsable, mant_contacto,
                 Id_Objeto]
            );
            if (result.affectedRows === 0) return { notFound: true };

            // Si la cantidad fue editada directamente: registrar incremento/decrecimiento manual
            if (cantidad !== undefined && cantidad !== null) {
                const despues = Number(cantidad);
                const diff = despues - Number(antes);
                if (diff !== 0) {
                    await createMovimiento(conn, {
                        Id_Objeto,
                        cantidad: Math.abs(diff),
                        tipo_movimiento: diff > 0 ? 'incremento_manual' : 'decrecimiento_manual',
                        origen_tipo: diff > 0 ? null : 'taller',
                        destino_tipo: diff > 0 ? 'taller' : null,
                        referencia_tabla: 'INVENTARIO',
                        referencia_id: Id_Objeto,
                        razon: razon || null,
                    });
                }
            }

            return { ok: true };
        });

        if (out?.notFound) return res.status(404).json({ error: 'No encontrado' });
        res.json({ message: 'Inventario actualizado' });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.remove = async (req, res) => {
    try {
        const result = await db.query('DELETE FROM INVENTARIO WHERE Id_Objeto = ?', [req.params.id]);
        if (result.affectedRows === 0) return res.status(404).json({ error: 'No encontrado' });
        res.json({ message: 'Inventario eliminado' });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

// ── INVENTARIO_USO ────────────────────────────────────────────────────────────
exports.getUsos = async (req, res) => {
    try { res.json(await db.query('SELECT * FROM INVENTARIO_USO WHERE Id_Objeto = ?', [req.params.id])); }
    catch (e) { res.status(500).json({ error: e.message }); }
};

exports.createUso = async (req, res) => {
    const { uso } = req.body;
    try {
        const result = await db.query(
            'INSERT INTO INVENTARIO_USO (Id_Objeto, uso) VALUES (?,?)',
            [req.params.id, uso]
        );
        res.status(201).json({ message: 'Uso creado', id: result.insertId });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.deleteUso = async (req, res) => {
    try {
        const result = await db.query(
            'DELETE FROM INVENTARIO_USO WHERE id=? AND Id_Objeto=?', [req.params.uid, req.params.id]
        );
        if (result.affectedRows === 0) return res.status(404).json({ error: 'No encontrado' });
        res.json({ message: 'Uso eliminado' });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

// ── MONITOREO / UBICACIONES ───────────────────────────────────────────────────
exports.getUbicaciones = async (req, res) => {
    try {
        const Id_Objeto = Number(req.params.id);

        const tallerRows = await db.query(
            'SELECT Id_Objeto, nombre_objeto, cantidad, merma_perdida FROM INVENTARIO WHERE Id_Objeto = ?',
            [Id_Objeto]
        );
        if (!tallerRows.length) return res.status(404).json({ error: 'No encontrado' });

        const camiones = await db.query(
            `SELECT CI.Placa as placa, CI.cantidad_actual as cantidad
             FROM CAMION_INVENTARIO CI
             WHERE CI.Id_Objeto = ? AND CI.cantidad_actual > 0`,
            [Id_Objeto]
        );

        const proyectos = await db.query(
            `SELECT
                PI.id as id_proyecto_inventario,
                PI.id_Proyecto as id_proyecto,
                P.Proyecto_Nombre as proyecto_nombre,
                CASE
                  WHEN PI.devolucion_pendiente > 0 THEN PI.devolucion_pendiente
                  -- compatibilidad: filas creadas antes de la migración quedaron con 0
                  ELSE PI.cantidad_objeto
                END as cantidad,
                PI.estado as estado_linea,
                PC.Placa as placa_camion,
                PI.fecha_devolucion_efectiva
             FROM PROYECTO_INVENTARIO PI
             JOIN PROYECTO P ON P.id_Proyecto = PI.id_Proyecto
             LEFT JOIN PROYECTO_CAMION PC ON PC.id = PI.id_proyecto_camion
             WHERE PI.Id_Objeto = ?
               AND (
                 PI.devolucion_pendiente > 0
                 OR (
                   PI.devolucion_pendiente = 0
                   AND PI.cantidad_objeto > 0
                   AND P.estado <> 'Completado'
                 )
               )`,
            [Id_Objeto]
        );

        res.json({
            objeto: tallerRows[0],
            taller: { cantidad: tallerRows[0].cantidad },
            camiones: camiones.map(c => ({ placa: c.placa, cantidad: c.cantidad, ubicacion: 'camion' })),
            proyectos: proyectos.map(p => ({
                id_proyecto: p.id_proyecto,
                proyecto_nombre: p.proyecto_nombre,
                id_proyecto_inventario: p.id_proyecto_inventario,
                cantidad: p.cantidad,
                estado_linea: p.estado_linea,
                ubicacion: p.placa_camion ? 'proyecto (via camion)' : 'proyecto',
                placa_camion: p.placa_camion || null,
                fecha_devolucion_efectiva: p.fecha_devolucion_efectiva || null
            })),
        });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.getMovimientos = async (req, res) => {
    try {
        const Id_Objeto = Number(req.params.id);
        const limit = Math.min(200, Number(req.query.limit || 100));
        const rows = await db.query(
            `SELECT * FROM INVENTARIO_MOVIMIENTO WHERE Id_Objeto = ? ORDER BY fecha DESC, id DESC LIMIT ?`,
            [Id_Objeto, limit]
        );
        res.json(rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
};
