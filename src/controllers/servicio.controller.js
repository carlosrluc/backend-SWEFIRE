const db = require('../config/db');
const fs = require('fs');
const path = require('path');
const {
    syncActividadFromSubservicio,
    buildPrincipalTemplate,
    buildServicioDetalleFlujo,
    getNextActividadOrden,
} = require('../services/servicioFlujo.service');
const {
    persistFlujoOnServicioCreate,
    mergeFlujoOnServicioUpdate,
} = require('../services/servicioFlujoWrite.service');
const {
    pagoPorDiaToBoolean,
    toPagoPorDiaEnum,
} = require('../services/servicioFechas.service');
const { toDateOnly } = require('../services/cotizacionDto.service');

function mapServicioRow(row) {
    if (!row) return row;
    return { ...row, pago_por_dia: pagoPorDiaToBoolean(row.pago_por_dia) };
}

function resolveFechaInicioProyecto(body, query) {
    return toDateOnly(
        body?.fecha_inicio_proyecto
        ?? body?.fecha_inicio
        ?? query?.fecha_inicio
        ?? null,
    );
}

const unlinkFotoIfExists = (fotoUrl) => {
    if (!fotoUrl) return;
    const abs = path.join(__dirname, '../../', fotoUrl);
    if (fs.existsSync(abs)) {
        try { fs.unlinkSync(abs); } catch (_) {}
    }
};

// ── SERVICIO ──────────────────────────────────────────────────────────────────
exports.getAll = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;

        const rows = await db.query(
            'SELECT * FROM SERVICIO ORDER BY ID_Servicio DESC LIMIT ? OFFSET ?',
            [limit, offset]
        );

        const countResult = await db.query('SELECT COUNT(*) as total FROM SERVICIO');
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

/** Catálogo público: activos, sin servicio 7, sin precio_regular */
exports.getPublico = async (req, res) => {
    try {
        const rows = await db.query(
            `SELECT ID_Servicio, nombre, descripcion, condicional_precio, observaciones, Estado, foto
             FROM SERVICIO
             WHERE Estado = 'Activo' AND ID_Servicio != 7
             ORDER BY ID_Servicio DESC`,
        );
        res.json({ data: rows });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.getById = async (req, res) => {
    try {
        const rows = await db.query('SELECT * FROM SERVICIO WHERE ID_Servicio = ?', [req.params.id]);
        if (!rows.length) return res.status(404).json({ error: 'No encontrado' });
        const fechaInicio = resolveFechaInicioProyecto(req.body, req.query);
        const flujo = await buildServicioDetalleFlujo(db, req.params.id, fechaInicio);
        res.json({ ...mapServicioRow(rows[0]), ...flujo });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.create = async (req, res) => {
    const {
        nombre, descripcion, precio_regular, pago_por_dia,
        condicional_precio, observaciones, Estado, etapas, subservicios,
    } = req.body;
    const fechaInicio = resolveFechaInicioProyecto(req.body, req.query);
    const conn = await db.getConnection();
    const exec = {
        query: async (sql, params) => {
            const [rows] = await conn.query(sql, params);
            return rows;
        },
    };
    try {
        await conn.beginTransaction();
        const result = await exec.query(
            `INSERT INTO SERVICIO
                (nombre, descripcion, precio_regular, pago_por_dia, condicional_precio, observaciones, Estado)
             VALUES (?,?,?,?,?,?,?)`,
            [nombre, descripcion, precio_regular, toPagoPorDiaEnum(pago_por_dia), condicional_precio, observaciones, Estado],
        );
        const newId = result.insertId;
        const flujoSync = await persistFlujoOnServicioCreate(exec, newId, { etapas, subservicios });
        await conn.commit();
        conn.release();
        const detalle = await buildServicioDetalleFlujo(db, newId, fechaInicio);
        res.status(201).json({
            message: 'Servicio creado',
            ID_Servicio: newId,
            etapas_creadas: flujoSync.etapas,
            subservicios_creados: flujoSync.subservicios,
            ...detalle,
        });
    } catch (e) {
        try { await conn.rollback(); } catch (_) {}
        conn.release();
        if (e.statusCode === 400) return res.status(400).json({ error: e.message });
        if (e.statusCode === 404) return res.status(404).json({ error: e.message });
        res.status(500).json({ error: e.message });
    }
};

exports.update = async (req, res) => {
    const {
        nombre, descripcion, precio_regular, pago_por_dia,
        condicional_precio, observaciones, Estado, etapas, subservicios,
    } = req.body;
    const fechaInicio = resolveFechaInicioProyecto(req.body, req.query);
    const conn = await db.getConnection();
    const exec = {
        query: async (sql, params) => {
            const [rows] = await conn.query(sql, params);
            return rows;
        },
    };
    try {
        await conn.beginTransaction();
        const updateFields = {
            nombre, descripcion, precio_regular, condicional_precio, observaciones, Estado,
        };
        if (pago_por_dia !== undefined) updateFields.pago_por_dia = toPagoPorDiaEnum(pago_por_dia);
        const setClauses = Object.keys(updateFields).map((k) => `${k}=?`).join(',');
        const result = await exec.query(
            `UPDATE SERVICIO SET ${setClauses} WHERE ID_Servicio=?`,
            [...Object.values(updateFields), req.params.id],
        );
        if (result.affectedRows === 0) {
            await conn.rollback();
            conn.release();
            return res.status(404).json({ error: 'No encontrado' });
        }
        const flujoSync = await mergeFlujoOnServicioUpdate(exec, req.params.id, { etapas, subservicios });
        await conn.commit();
        conn.release();
        const rows = await db.query('SELECT * FROM SERVICIO WHERE ID_Servicio = ?', [req.params.id]);
        const detalle = await buildServicioDetalleFlujo(db, req.params.id, fechaInicio);
        res.json({
            message: 'Servicio actualizado',
            ...mapServicioRow(rows[0]),
            ...detalle,
            ...flujoSync,
        });
    } catch (e) {
        try { await conn.rollback(); } catch (_) {}
        conn.release();
        if (e.statusCode === 400) return res.status(400).json({ error: e.message });
        if (e.statusCode === 404) return res.status(404).json({ error: e.message });
        res.status(500).json({ error: e.message });
    }
};

exports.remove = async (req, res) => {
    try {
        const rows = await db.query('SELECT foto FROM SERVICIO WHERE ID_Servicio = ?', [req.params.id]);
        if (!rows.length) return res.status(404).json({ error: 'No encontrado' });

        unlinkFotoIfExists(rows[0].foto);

        await db.query('DELETE FROM SERVICIO WHERE ID_Servicio = ?', [req.params.id]);
        res.json({ message: 'Servicio eliminado' });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

// ── SERVICIO.foto (PNG/JPEG, URL relativa en BD) ──────────────────────────────
exports.uploadFoto = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No se subió ningún archivo' });

        const rows = await db.query('SELECT foto FROM SERVICIO WHERE ID_Servicio = ?', [req.params.id]);
        if (!rows.length) {
            fs.unlinkSync(req.file.path);
            return res.status(404).json({ error: 'Servicio no encontrado' });
        }

        unlinkFotoIfExists(rows[0].foto);

        const relativeUrl = `/uploads/servicios/${req.file.filename}`;
        await db.query('UPDATE SERVICIO SET foto = ? WHERE ID_Servicio = ?', [
            relativeUrl, req.params.id,
        ]);

        res.status(200).json({ message: 'Fotografía subida', url: relativeUrl });
    } catch (e) {
        if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        res.status(500).json({ error: e.message });
    }
};

exports.getFoto = async (req, res) => {
    try {
        const rows = await db.query('SELECT foto FROM SERVICIO WHERE ID_Servicio = ?', [req.params.id]);
        if (!rows.length) return res.status(404).json({ error: 'Servicio no encontrado' });
        if (!rows[0].foto) return res.status(404).json({ error: 'Fotografía no encontrada' });
        res.redirect(rows[0].foto);
    } catch (e) { res.status(500).json({ error: e.message }); }
};

// ── SERVICIO_PERSONAL_REQUERIDO ───────────────────────────────────────────────
exports.getPersonal = async (req, res) => {
    try { res.json(await db.query('SELECT * FROM SERVICIO_PERSONAL_REQUERIDO WHERE ID_Servicio = ? ORDER BY id DESC', [req.params.id])); }
    catch (e) { res.status(500).json({ error: e.message }); }
};

exports.createPersonal = async (req, res) => {
    const { profesion, cantidad, disponibilidad, requerimiento_legal } = req.body;
    try {
        const result = await db.query(
            'INSERT INTO SERVICIO_PERSONAL_REQUERIDO (ID_Servicio,profesion,cantidad,disponibilidad,requerimiento_legal) VALUES (?,?,?,?,?)',
            [req.params.id, profesion, cantidad, disponibilidad, requerimiento_legal]
        );
        res.status(201).json({ message: 'Personal requerido creado', id: result.insertId });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.updatePersonal = async (req, res) => {
    const { profesion, cantidad, disponibilidad, requerimiento_legal } = req.body;
    try {
        const result = await db.query(
            'UPDATE SERVICIO_PERSONAL_REQUERIDO SET profesion=?, cantidad=?, disponibilidad=?, requerimiento_legal=? WHERE id=? AND ID_Servicio=?',
            [profesion, cantidad, disponibilidad, requerimiento_legal, req.params.pid, req.params.id]
        );
        if (result.affectedRows === 0) return res.status(404).json({ error: 'No encontrado' });
        res.json({ message: 'Personal requerido actualizado' });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.deletePersonal = async (req, res) => {
    try {
        const result = await db.query(
            'DELETE FROM SERVICIO_PERSONAL_REQUERIDO WHERE id=? AND ID_Servicio=?', [req.params.pid, req.params.id]
        );
        if (result.affectedRows === 0) return res.status(404).json({ error: 'No encontrado' });
        res.json({ message: 'Personal requerido eliminado' });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

// ── SERVICIO_INVENTARIO_REQUERIDO ─────────────────────────────────────────────
const ESTANCIAS_VALIDAS = new Set(['para proyecto', 'para inventario']);

const inventarioRequeridoSelect = `
    SELECT sir.ID_Servicio, sir.Id_Objeto, sir.cantidad, sir.estancia,
           i.nombre_objeto
    FROM SERVICIO_INVENTARIO_REQUERIDO sir
    LEFT JOIN INVENTARIO i ON i.Id_Objeto = sir.Id_Objeto
`;

exports.getInventarioRequerido = async (req, res) => {
    try {
        const rows = await db.query(
            `${inventarioRequeridoSelect} WHERE sir.ID_Servicio = ? ORDER BY sir.Id_Objeto DESC`,
            [req.params.id],
        );
        res.json(rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.getInventarioRequeridoByObjeto = async (req, res) => {
    try {
        const rows = await db.query(
            `${inventarioRequeridoSelect} WHERE sir.ID_Servicio = ? AND sir.Id_Objeto = ?`,
            [req.params.id, req.params.idObjeto],
        );
        if (!rows.length) return res.status(404).json({ error: 'No encontrado' });
        res.json(rows[0]);
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.createInventarioRequerido = async (req, res) => {
    const { Id_Objeto, cantidad, estancia } = req.body;
    const estanciaFinal = estancia || 'para inventario';

    if (!Id_Objeto) return res.status(400).json({ error: 'Id_Objeto es requerido' });
    if (!cantidad || Number(cantidad) <= 0) {
        return res.status(400).json({ error: 'cantidad debe ser mayor a 0' });
    }
    if (!ESTANCIAS_VALIDAS.has(estanciaFinal)) {
        return res.status(400).json({ error: 'estancia inválida. Use: para proyecto | para inventario' });
    }

    try {
        const servicio = await db.query('SELECT ID_Servicio FROM SERVICIO WHERE ID_Servicio = ?', [req.params.id]);
        if (!servicio.length) return res.status(404).json({ error: 'Servicio no encontrado' });

        const objeto = await db.query('SELECT Id_Objeto FROM INVENTARIO WHERE Id_Objeto = ?', [Id_Objeto]);
        if (!objeto.length) return res.status(404).json({ error: 'Objeto de inventario no encontrado' });

        await db.query(
            'INSERT INTO SERVICIO_INVENTARIO_REQUERIDO (ID_Servicio, Id_Objeto, cantidad, estancia) VALUES (?,?,?,?)',
            [req.params.id, Id_Objeto, cantidad, estanciaFinal],
        );
        res.status(201).json({
            message: 'Inventario requerido creado',
            ID_Servicio: Number(req.params.id),
            Id_Objeto,
            cantidad: Number(cantidad),
            estancia: estanciaFinal,
        });
    } catch (e) {
        if (e.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ error: 'El objeto ya está registrado para este servicio' });
        }
        res.status(500).json({ error: e.message });
    }
};

exports.updateInventarioRequerido = async (req, res) => {
    const { cantidad, estancia } = req.body;

    if (cantidad !== undefined && Number(cantidad) <= 0) {
        return res.status(400).json({ error: 'cantidad debe ser mayor a 0' });
    }
    if (estancia !== undefined && !ESTANCIAS_VALIDAS.has(estancia)) {
        return res.status(400).json({ error: 'estancia inválida. Use: para proyecto | para inventario' });
    }
    if (cantidad === undefined && estancia === undefined) {
        return res.status(400).json({ error: 'Debe enviar cantidad y/o estancia para actualizar' });
    }

    try {
        const actual = await db.query(
            'SELECT cantidad, estancia FROM SERVICIO_INVENTARIO_REQUERIDO WHERE ID_Servicio = ? AND Id_Objeto = ?',
            [req.params.id, req.params.idObjeto],
        );
        if (!actual.length) return res.status(404).json({ error: 'No encontrado' });

        const cantidadFinal = cantidad !== undefined ? Number(cantidad) : actual[0].cantidad;
        const estanciaFinal = estancia !== undefined ? estancia : actual[0].estancia;

        const result = await db.query(
            'UPDATE SERVICIO_INVENTARIO_REQUERIDO SET cantidad = ?, estancia = ? WHERE ID_Servicio = ? AND Id_Objeto = ?',
            [cantidadFinal, estanciaFinal, req.params.id, req.params.idObjeto],
        );
        if (result.affectedRows === 0) return res.status(404).json({ error: 'No encontrado' });
        res.json({
            message: 'Inventario requerido actualizado',
            ID_Servicio: Number(req.params.id),
            Id_Objeto: Number(req.params.idObjeto),
            cantidad: cantidadFinal,
            estancia: estanciaFinal,
        });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.deleteInventarioRequerido = async (req, res) => {
    try {
        const result = await db.query(
            'DELETE FROM SERVICIO_INVENTARIO_REQUERIDO WHERE ID_Servicio = ? AND Id_Objeto = ?',
            [req.params.id, req.params.idObjeto],
        );
        if (result.affectedRows === 0) return res.status(404).json({ error: 'No encontrado' });
        res.json({ message: 'Inventario requerido eliminado' });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

// ── GET plantilla principal (catálogo) ────────────────────────────────────────
exports.getPrincipal = async (req, res) => {
    try {
        const fechaInicio = resolveFechaInicioProyecto(req.body, req.query);
        const template = await buildPrincipalTemplate(db, req.params.id, fechaInicio);
        if (!template) return res.status(404).json({ error: 'Servicio no encontrado' });
        res.json(template);
    } catch (e) { res.status(500).json({ error: e.message }); }
};

// ── SERVICIO_ETAPA ────────────────────────────────────────────────────────────
exports.getEtapas = async (req, res) => {
    try {
        const rows = await db.query(
            'SELECT * FROM SERVICIO_ETAPA WHERE ID_Servicio = ? ORDER BY orden ASC, id ASC',
            [req.params.id],
        );
        res.json(rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.createEtapa = async (req, res) => {
    const { nombre, descripcion, duracion, orden } = req.body;
    if (!nombre) return res.status(400).json({ error: 'nombre es requerido' });
    try {
        const svc = await db.query('SELECT ID_Servicio FROM SERVICIO WHERE ID_Servicio = ?', [req.params.id]);
        if (!svc.length) return res.status(404).json({ error: 'Servicio no encontrado' });

        const result = await db.query(
            `INSERT INTO SERVICIO_ETAPA (ID_Servicio, nombre, descripcion, duracion, orden)
             VALUES (?,?,?,?,?)`,
            [req.params.id, nombre, descripcion ?? null, duracion ?? 0, orden ?? 1],
        );
        res.status(201).json({ message: 'Etapa creada', id: result.insertId });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.updateEtapa = async (req, res) => {
    const { nombre, descripcion, duracion, orden } = req.body;
    try {
        const result = await db.query(
            `UPDATE SERVICIO_ETAPA SET nombre=?, descripcion=?, duracion=?, orden=?
             WHERE id=? AND ID_Servicio=?`,
            [nombre, descripcion, duracion, orden, req.params.eid, req.params.id],
        );
        if (result.affectedRows === 0) return res.status(404).json({ error: 'No encontrado' });
        res.json({ message: 'Etapa actualizada' });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.deleteEtapa = async (req, res) => {
    try {
        const result = await db.query(
            'DELETE FROM SERVICIO_ETAPA WHERE id=? AND ID_Servicio=?',
            [req.params.eid, req.params.id],
        );
        if (result.affectedRows === 0) return res.status(404).json({ error: 'No encontrado' });
        res.json({ message: 'Etapa eliminada' });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

// ── SERVICIO_ACTIVIDAD ────────────────────────────────────────────────────────
exports.getActividades = async (req, res) => {
    try {
        const rows = await db.query(
            `SELECT * FROM SERVICIO_ACTIVIDAD
             WHERE id_servicio_etapa = ? AND ID_Servicio = ?
             ORDER BY orden ASC, id ASC`,
            [req.params.eid, req.params.id],
        );
        res.json(rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.createActividad = async (req, res) => {
    const { nombre, orden } = req.body;
    if (!nombre) return res.status(400).json({ error: 'nombre es requerido' });
    try {
        const etapa = await db.query(
            'SELECT id FROM SERVICIO_ETAPA WHERE id = ? AND ID_Servicio = ?',
            [req.params.eid, req.params.id],
        );
        if (!etapa.length) return res.status(404).json({ error: 'Etapa no encontrada' });

        const ordenFinal = orden ?? await getNextActividadOrden(db, req.params.eid);
        const result = await db.query(
            `INSERT INTO SERVICIO_ACTIVIDAD (id_servicio_etapa, ID_Servicio, nombre, orden, origen)
             VALUES (?,?,?,?, 'manual')`,
            [req.params.eid, req.params.id, nombre, ordenFinal],
        );
        res.status(201).json({ message: 'Actividad creada', id: result.insertId });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.updateActividad = async (req, res) => {
    const { nombre, orden } = req.body;
    try {
        const actual = await db.query(
            `SELECT origen FROM SERVICIO_ACTIVIDAD WHERE id=? AND id_servicio_etapa=? AND ID_Servicio=?`,
            [req.params.aid, req.params.eid, req.params.id],
        );
        if (!actual.length) return res.status(404).json({ error: 'No encontrado' });
        if (actual[0].origen === 'subservicio') {
            return res.status(400).json({ error: 'Las actividades de subservicio se gestionan vía subservicios' });
        }

        const result = await db.query(
            `UPDATE SERVICIO_ACTIVIDAD SET nombre=?, orden=?
             WHERE id=? AND id_servicio_etapa=? AND ID_Servicio=?`,
            [nombre, orden, req.params.aid, req.params.eid, req.params.id],
        );
        if (result.affectedRows === 0) return res.status(404).json({ error: 'No encontrado' });
        res.json({ message: 'Actividad actualizada' });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.deleteActividad = async (req, res) => {
    try {
        const actual = await db.query(
            `SELECT origen FROM SERVICIO_ACTIVIDAD WHERE id=? AND id_servicio_etapa=? AND ID_Servicio=?`,
            [req.params.aid, req.params.eid, req.params.id],
        );
        if (!actual.length) return res.status(404).json({ error: 'No encontrado' });
        if (actual[0].origen === 'subservicio') {
            return res.status(400).json({ error: 'Las actividades de subservicio se gestionan vía subservicios' });
        }

        const result = await db.query(
            'DELETE FROM SERVICIO_ACTIVIDAD WHERE id=? AND id_servicio_etapa=? AND ID_Servicio=?',
            [req.params.aid, req.params.eid, req.params.id],
        );
        if (result.affectedRows === 0) return res.status(404).json({ error: 'No encontrado' });
        res.json({ message: 'Actividad eliminada' });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

// ── SERVICIO_SUBSERVICIO ──────────────────────────────────────────────────────
exports.getSubservicios = async (req, res) => {
    try {
        const rows = await db.query(
            `SELECT ss.*, s.nombre AS nombre_subservicio,
                    se.nombre AS nombre_etapa, se.orden AS orden_etapa
             FROM SERVICIO_SUBSERVICIO ss
             INNER JOIN SERVICIO s ON s.ID_Servicio = ss.ID_Servicio_subservicio
             INNER JOIN SERVICIO_ETAPA se ON se.id = ss.id_servicio_etapa
             WHERE ss.ID_Servicio = ?
             ORDER BY ss.id ASC`,
            [req.params.id],
        );
        res.json(rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.createSubservicio = async (req, res) => {
    const { ID_Servicio_subservicio, id_servicio_etapa } = req.body;
    if (!ID_Servicio_subservicio || !id_servicio_etapa) {
        return res.status(400).json({ error: 'ID_Servicio_subservicio e id_servicio_etapa son requeridos' });
    }
    if (Number(ID_Servicio_subservicio) === Number(req.params.id)) {
        return res.status(400).json({ error: 'Un servicio no puede ser subservicio de sí mismo' });
    }
    try {
        const [svc, sub, etapa] = await Promise.all([
            db.query('SELECT ID_Servicio FROM SERVICIO WHERE ID_Servicio = ?', [req.params.id]),
            db.query('SELECT ID_Servicio FROM SERVICIO WHERE ID_Servicio = ?', [ID_Servicio_subservicio]),
            db.query('SELECT id FROM SERVICIO_ETAPA WHERE id = ? AND ID_Servicio = ?', [id_servicio_etapa, req.params.id]),
        ]);
        if (!svc.length) return res.status(404).json({ error: 'Servicio principal no encontrado' });
        if (!sub.length) return res.status(404).json({ error: 'Servicio subservicio no encontrado' });
        if (!etapa.length) return res.status(404).json({ error: 'Etapa no pertenece al servicio principal' });

        const result = await db.query(
            `INSERT INTO SERVICIO_SUBSERVICIO (ID_Servicio, ID_Servicio_subservicio, id_servicio_etapa)
             VALUES (?,?,?)`,
            [req.params.id, ID_Servicio_subservicio, id_servicio_etapa],
        );
        await syncActividadFromSubservicio(db, result.insertId);
        res.status(201).json({ message: 'Subservicio creado', id: result.insertId });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.updateSubservicio = async (req, res) => {
    const { ID_Servicio_subservicio, id_servicio_etapa } = req.body;
    try {
        if (ID_Servicio_subservicio && Number(ID_Servicio_subservicio) === Number(req.params.id)) {
            return res.status(400).json({ error: 'Un servicio no puede ser subservicio de sí mismo' });
        }
        const actual = await db.query(
            'SELECT * FROM SERVICIO_SUBSERVICIO WHERE id=? AND ID_Servicio=?',
            [req.params.sid, req.params.id],
        );
        if (!actual.length) return res.status(404).json({ error: 'No encontrado' });

        if (id_servicio_etapa) {
            const etapa = await db.query(
                'SELECT id FROM SERVICIO_ETAPA WHERE id = ? AND ID_Servicio = ?',
                [id_servicio_etapa, req.params.id],
            );
            if (!etapa.length) return res.status(404).json({ error: 'Etapa no pertenece al servicio principal' });
        }

        await db.query(
            `UPDATE SERVICIO_SUBSERVICIO
             SET ID_Servicio_subservicio=COALESCE(?, ID_Servicio_subservicio),
                 id_servicio_etapa=COALESCE(?, id_servicio_etapa)
             WHERE id=? AND ID_Servicio=?`,
            [ID_Servicio_subservicio ?? null, id_servicio_etapa ?? null, req.params.sid, req.params.id],
        );
        await syncActividadFromSubservicio(db, req.params.sid);
        res.json({ message: 'Subservicio actualizado' });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.deleteSubservicio = async (req, res) => {
    try {
        const result = await db.query(
            'DELETE FROM SERVICIO_SUBSERVICIO WHERE id=? AND ID_Servicio=?',
            [req.params.sid, req.params.id],
        );
        if (result.affectedRows === 0) return res.status(404).json({ error: 'No encontrado' });
        res.json({ message: 'Subservicio eliminado' });
    } catch (e) { res.status(500).json({ error: e.message }); }
};
