const db = require('../config/db');
const fs = require('fs');
const path = require('path');
const { validarEtapaActividadProyecto, recalcFechasEtapasDesdeInformes } = require('../services/proyectoEtapas.service');
const catchAsync = require('../utils/catchAsync');
const { getAll } = require('../repositories/reports.repository');

const SELECT_INFORME = `
    SELECT I.*,
           P.Proyecto_Nombre,
           PER.Nombre AS Autor_Nombre,
           PER.Apellido AS Autor_Apellido,
           INC.estado AS Incidencia_Estado,
           INC.nombre_incidencia AS Incidencia_Nombre,
           PE.codigo AS Etapa_Codigo,
           PE.nombre AS Etapa_Nombre,
           PE.estado AS Etapa_Estado,
           PA.codigo AS Actividad_Codigo,
           PA.nombre AS Actividad_Nombre,
           PA.estado AS Actividad_Estado
    FROM INFORME I
    JOIN PROYECTO P ON P.id_Proyecto = I.id_Proyecto
    JOIN PERFIL PER ON PER.DNI = I.DNI_autor
    LEFT JOIN INCIDENCIA INC ON INC.id_incidencia = I.id_incidencia
    LEFT JOIN PROYECTO_ETAPA PE ON PE.id = I.id_proyecto_etapa
    LEFT JOIN PROYECTO_ACTIVIDAD PA ON PA.id = I.id_proyecto_actividad
`;

const mapInforme = (row) => ({
    ...row,
    relacion: row.id_incidencia ? String(row.id_incidencia) : 'ninguna',
    autor_nombre: [row.Autor_Nombre, row.Autor_Apellido].filter(Boolean).join(' ').trim() || null,
    etapa: row.id_proyecto_etapa ? {
        id: row.id_proyecto_etapa,
        codigo: row.Etapa_Codigo,
        nombre: row.Etapa_Nombre,
        estado: row.Etapa_Estado,
    } : null,
    actividad: row.id_proyecto_actividad ? {
        id: row.id_proyecto_actividad,
        codigo: row.Actividad_Codigo,
        nombre: row.Actividad_Nombre,
        estado: row.Actividad_Estado,
    } : null,
});

const parseRelacionIncidencia = (relacion, id_incidencia) => {
    if (id_incidencia !== undefined && id_incidencia !== null && id_incidencia !== '') {
        const parsed = Number(id_incidencia);
        if (Number.isNaN(parsed)) throw new Error('id_incidencia inválido');
        return parsed;
    }
    if (relacion === undefined || relacion === null || relacion === '' || relacion === 'ninguna') {
        return null;
    }
    const parsed = Number(relacion);
    if (Number.isNaN(parsed)) throw new Error('relacion inválida: use "ninguna" o el id de incidencia');
    return parsed;
};

const parseFechaOcurrencia = (value) => {
    if (value === undefined || value === null || value === '') return null;
    const s = String(value).slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) throw new Error('fecha inválida (use YYYY-MM-DD)');
    return s;
};

const parseOptionalId = (value, label) => {
    if (value === undefined || value === null || value === '') return null;
    const parsed = Number(value);
    if (Number.isNaN(parsed)) throw new Error(`${label} inválido`);
    return parsed;
};

const validarIncidenciaProyecto = async (id_incidencia, id_Proyecto) => {
    if (id_incidencia === null) return;
    const rows = await db.query(
        'SELECT id_incidencia FROM INCIDENCIA WHERE id_incidencia = ? AND id_proyecto = ?',
        [id_incidencia, id_Proyecto]
    );
    if (!rows.length) {
        throw new Error('La incidencia no existe o no pertenece a este proyecto');
    }
};

const obtenerNombreProyectoDefault = async (id_Proyecto) => {
    const rows = await db.query('SELECT Proyecto_Nombre FROM PROYECTO WHERE id_Proyecto = ?', [id_Proyecto]);
    if (!rows.length) throw new Error('Proyecto no encontrado');
    return rows[0].Proyecto_Nombre || 'Informe';
};

exports.getInformes = catchAsync(async (req, res) => {
    const id_Proyecto = Number(req.params.id);
    const result = await getAll(id_Proyecto, {
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 10,
        nombre: req.query.nombre
    })
    return res.status(200).json(result);
});

exports.getInformeById = async (req, res) => {
    try {
        const rows = await db.query(
            `${SELECT_INFORME} WHERE I.id = ? AND I.id_Proyecto = ?`,
            [req.params.iid, req.params.id]
        );
        if (!rows.length) return res.status(404).json({ error: 'No encontrado' });
        res.json(mapInforme(rows[0]));
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

exports.createInforme = async (req, res) => {
    const id_Proyecto = Number(req.params.id);
    const {
        nombre, fecha, hora, descripcion, ubicacion,
        relacion, id_incidencia,
        id_proyecto_etapa, id_proyecto_actividad,
    } = req.body;

    try {
        const DNI_autor = req.user?.dni_perfil;
        if (!DNI_autor) {
            return res.status(401).json({ error: 'Usuario sin perfil asociado' });
        }
        if (!hora) {
            return res.status(400).json({ error: 'hora es requerida' });
        }
        const fechaOcurrencia = parseFechaOcurrencia(fecha);
        if (!fechaOcurrencia) {
            return res.status(400).json({ error: 'fecha es requerida (día en que ocurrió el suceso, YYYY-MM-DD)' });
        }

        const nombreFinal = nombre || await obtenerNombreProyectoDefault(id_Proyecto);
        const idInc = parseRelacionIncidencia(relacion, id_incidencia);
        await validarIncidenciaProyecto(idInc, id_Proyecto);

        const idEtapa = parseOptionalId(id_proyecto_etapa, 'id_proyecto_etapa');
        const idActividad = parseOptionalId(id_proyecto_actividad, 'id_proyecto_actividad');
        await validarEtapaActividadProyecto(db, id_Proyecto, idEtapa, idActividad);

        const result = await db.query(
            `INSERT INTO INFORME
                (nombre, fecha, hora, DNI_autor, descripcion, ubicacion, id_incidencia, id_proyecto_etapa, id_proyecto_actividad, id_Proyecto)
             VALUES (?,?,?,?,?,?,?,?,?,?)`,
            [nombreFinal, fechaOcurrencia, hora, DNI_autor, descripcion || null, ubicacion || null, idInc, idEtapa, idActividad, id_Proyecto]
        );

        await recalcFechasEtapasDesdeInformes(db, id_Proyecto);

        const rows = await db.query(
            `${SELECT_INFORME} WHERE I.id = ?`,
            [result.insertId]
        );
        res.status(201).json(mapInforme(rows[0]));
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

exports.updateInforme = async (req, res) => {
    const id_Proyecto = Number(req.params.id);
    const id = Number(req.params.iid);
    const {
        nombre, fecha, hora, descripcion, ubicacion,
        relacion, id_incidencia,
        id_proyecto_etapa, id_proyecto_actividad,
    } = req.body;

    try {
        const actual = await db.query(
            'SELECT * FROM INFORME WHERE id = ? AND id_Proyecto = ?',
            [id, id_Proyecto],
        );
        if (!actual.length) return res.status(404).json({ error: 'No encontrado' });
        const cur = actual[0];

        const idInc = parseRelacionIncidencia(
            relacion !== undefined ? relacion : (cur.id_incidencia ? String(cur.id_incidencia) : 'ninguna'),
            id_incidencia !== undefined ? id_incidencia : cur.id_incidencia,
        );
        await validarIncidenciaProyecto(idInc, id_Proyecto);

        const idEtapa = id_proyecto_etapa !== undefined
            ? parseOptionalId(id_proyecto_etapa, 'id_proyecto_etapa')
            : cur.id_proyecto_etapa;
        const idActividad = id_proyecto_actividad !== undefined
            ? parseOptionalId(id_proyecto_actividad, 'id_proyecto_actividad')
            : cur.id_proyecto_actividad;
        await validarEtapaActividadProyecto(db, id_Proyecto, idEtapa, idActividad);

        const fechaFinal = fecha !== undefined
            ? parseFechaOcurrencia(fecha) || cur.fecha
            : cur.fecha;

        const result = await db.query(
            `UPDATE INFORME
             SET nombre=?, fecha=?, hora=?, descripcion=?, ubicacion=?, id_incidencia=?,
                 id_proyecto_etapa=?, id_proyecto_actividad=?
             WHERE id=? AND id_Proyecto=?`,
            [
                nombre !== undefined ? nombre : cur.nombre,
                fechaFinal,
                hora !== undefined ? hora : cur.hora,
                descripcion !== undefined ? descripcion : cur.descripcion,
                ubicacion !== undefined ? ubicacion : cur.ubicacion,
                idInc,
                idEtapa,
                idActividad,
                id,
                id_Proyecto,
            ],
        );
        if (result.affectedRows === 0) return res.status(404).json({ error: 'No encontrado' });

        await recalcFechasEtapasDesdeInformes(db, id_Proyecto);

        const rows = await db.query(
            `${SELECT_INFORME} WHERE I.id = ?`,
            [id]
        );
        res.json(mapInforme(rows[0]));
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

exports.deleteInforme = async (req, res) => {
    try {
        const rows = await db.query(
            'SELECT evidencia FROM INFORME WHERE id = ? AND id_Proyecto = ?',
            [req.params.iid, req.params.id]
        );
        if (!rows.length) return res.status(404).json({ error: 'No encontrado' });

        const evidencia = rows[0].evidencia;
        if (evidencia) {
            const abs = path.join(__dirname, '../../', evidencia);
            if (fs.existsSync(abs)) {
                try { fs.unlinkSync(abs); } catch (_) { }
            }
        }

        await db.query('DELETE FROM INFORME WHERE id = ? AND id_Proyecto = ?', [req.params.iid, req.params.id]);
        await recalcFechasEtapasDesdeInformes(db, Number(req.params.id));
        res.json({ message: 'Informe eliminado' });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

exports.uploadEvidencia = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No se subió ningún archivo' });

        const rows = await db.query(
            'SELECT evidencia FROM INFORME WHERE id = ? AND id_Proyecto = ?',
            [req.params.iid, req.params.id]
        );
        if (!rows.length) {
            fs.unlinkSync(req.file.path);
            return res.status(404).json({ error: 'Informe no encontrado' });
        }

        const oldUrl = rows[0].evidencia;
        if (oldUrl) {
            const oldAbs = path.join(__dirname, '../../', oldUrl);
            if (fs.existsSync(oldAbs)) {
                try { fs.unlinkSync(oldAbs); } catch (_) { }
            }
        }

        const relativeUrl = `/uploads/informes/${req.file.filename}`;
        await db.query('UPDATE INFORME SET evidencia = ? WHERE id = ? AND id_Proyecto = ?', [
            relativeUrl, req.params.iid, req.params.id,
        ]);

        res.status(200).json({ message: 'Evidencia subida', url: relativeUrl });
    } catch (e) {
        if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        res.status(500).json({ error: e.message });
    }
};

exports.getEvidencia = async (req, res) => {
    try {
        const rows = await db.query(
            'SELECT evidencia FROM INFORME WHERE id = ? AND id_Proyecto = ?',
            [req.params.iid, req.params.id]
        );
        if (!rows.length) return res.status(404).json({ error: 'Informe no encontrado' });
        if (!rows[0].evidencia) return res.status(404).json({ error: 'Evidencia no encontrada' });
        res.redirect(rows[0].evidencia);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};
