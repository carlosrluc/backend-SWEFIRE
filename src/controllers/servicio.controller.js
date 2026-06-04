const db = require('../config/db');

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

exports.getById = async (req, res) => {
    try {
        const rows = await db.query('SELECT * FROM SERVICIO WHERE ID_Servicio = ?', [req.params.id]);
        if (!rows.length) return res.status(404).json({ error: 'No encontrado' });
        res.json(rows[0]);
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.create = async (req, res) => {
    const { nombre, descripcion, precio_regular, condicional_precio, observaciones, Estado } = req.body;
    try {
        const result = await db.query(
            'INSERT INTO SERVICIO (nombre,descripcion,precio_regular,condicional_precio,observaciones,Estado) VALUES (?,?,?,?,?,?)',
            [nombre, descripcion, precio_regular, condicional_precio, observaciones, Estado]
        );
        res.status(201).json({ message: 'Servicio creado', ID_Servicio: result.insertId });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.update = async (req, res) => {
    const { nombre, descripcion, precio_regular, condicional_precio, observaciones, Estado } = req.body;
    try {
        const result = await db.query(
            'UPDATE SERVICIO SET nombre=?,descripcion=?,precio_regular=?,condicional_precio=?,observaciones=?,Estado=? WHERE ID_Servicio=?',
            [nombre, descripcion, precio_regular, condicional_precio, observaciones, Estado, req.params.id]
        );
        if (result.affectedRows === 0) return res.status(404).json({ error: 'No encontrado' });
        res.json({ message: 'Servicio actualizado' });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.remove = async (req, res) => {
    try {
        const result = await db.query('DELETE FROM SERVICIO WHERE ID_Servicio = ?', [req.params.id]);
        if (result.affectedRows === 0) return res.status(404).json({ error: 'No encontrado' });
        res.json({ message: 'Servicio eliminado' });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

// ── SERVICIO_PERSONAL_REQUERIDO ───────────────────────────────────────────────
exports.getPersonal = async (req, res) => {
    try { res.json(await db.query('SELECT * FROM SERVICIO_PERSONAL_REQUERIDO WHERE ID_Servicio = ?', [req.params.id])); }
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
            `${inventarioRequeridoSelect} WHERE sir.ID_Servicio = ? ORDER BY i.nombre_objeto`,
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
