const db = require('../config/db');
const { formatQuotation } = require('./cotizacion.controller');

const normalizeRol = (rol) => {
    if (!rol) return null;
    return rol.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '');
};

const CAMPOS_PERFIL_CLIENTE = [
    'DNI', 'Nombre', 'Apellido', 'Genero', 'RUC',
    'correo_contacto', 'telefono_contacto', 'foto_perfil', 'profesion',
];

const formatearPerfilPorRol = (row, brevetes, educacion, certificaciones) => {
    const rolNorm = normalizeRol(row.rol);
    const relacionado = { brevetes, educacion, certificaciones };

    if (rolNorm === 'cliente') {
        const perfil = {};
        for (const campo of CAMPOS_PERFIL_CLIENTE) {
            perfil[campo] = row[campo] ?? null;
        }
        return { ...perfil, rol: row.rol ?? null, ...relacionado };
    }

    const { rol, ...perfil } = row;
    return { ...perfil, rol: rol ?? null, ...relacionado };
};

const agruparPorDni = (rows, campoDni) => {
    const map = new Map();
    for (const r of rows) {
        const dni = r[campoDni];
        if (!map.has(dni)) map.set(dni, []);
        map.get(dni).push(r);
    }
    return map;
};

const buildFiltrosPerfil = (query) => {
    const where = [];
    const params = [];
    const { nombre, apellido, rol } = query;

    if (nombre) {
        where.push('P.Nombre LIKE ?');
        params.push(`%${nombre}%`);
    }
    if (apellido) {
        where.push('P.Apellido LIKE ?');
        params.push(`%${apellido}%`);
    }
    if (rol) {
        where.push('u.rol IS NOT NULL AND LOWER(u.rol) = ?');
        params.push(normalizeRol(rol));
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    return { whereSql, params };
};

const cargarRelacionadosPorDnis = async (dnis) => {
    if (!dnis.length) {
        return { brevetesMap: new Map(), educacionMap: new Map(), certMap: new Map() };
    }
    const placeholders = dnis.map(() => '?').join(',');
    const [brevetesRows, educacionRows, certRows] = await Promise.all([
        db.query(`SELECT * FROM PERFIL_BREVETE WHERE DNI_perfil IN (${placeholders})`, dnis),
        db.query(`SELECT * FROM PERFIL_EDUCACION WHERE DNI_perfil IN (${placeholders})`, dnis),
        db.query(`SELECT * FROM PERFIL_CERTIFICACION WHERE DNI_perfil IN (${placeholders})`, dnis),
    ]);
    return {
        brevetesMap: agruparPorDni(brevetesRows, 'DNI_perfil'),
        educacionMap: agruparPorDni(educacionRows, 'DNI_perfil'),
        certMap: agruparPorDni(certRows, 'DNI_perfil'),
    };
};

const obtenerPerfilPersonalFormateado = async (dni) => {
    const rows = await db.query(
        `SELECT P.*, u.rol
         FROM PERFIL P
         LEFT JOIN USUARIO u ON u.dni_perfil = P.DNI
         WHERE P.DNI = ?`,
        [dni]
    );
    if (!rows.length) return null;

    const { brevetesMap, educacionMap, certMap } = await cargarRelacionadosPorDnis([dni]);
    return formatearPerfilPorRol(
        rows[0],
        brevetesMap.get(dni) || [],
        educacionMap.get(dni) || [],
        certMap.get(dni) || [],
    );
};

// ── PERFIL ────────────────────────────────────────────────────────────────────
exports.getAll = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;
        const { whereSql, params } = buildFiltrosPerfil(req.query);

        const countRows = await db.query(
            `SELECT COUNT(DISTINCT P.DNI) as total
             FROM PERFIL P
             LEFT JOIN USUARIO u ON u.dni_perfil = P.DNI
             ${whereSql}`,
            params
        );
        const total = countRows[0].total;

        const rows = await db.query(
            `SELECT P.*, u.rol
             FROM PERFIL P
             LEFT JOIN USUARIO u ON u.dni_perfil = P.DNI
             ${whereSql}
             ORDER BY P.DNI DESC
             LIMIT ? OFFSET ?`,
            [...params, limit, offset]
        );

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

/**
 * Listado de personal con campos según rol de USUARIO y datos relacionados.
 * Query: nombre, apellido, rol, page, limit
 */
exports.getPersonal = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;
        const { whereSql, params } = buildFiltrosPerfil(req.query);

        const countRows = await db.query(
            `SELECT COUNT(DISTINCT P.DNI) as total
             FROM PERFIL P
             LEFT JOIN USUARIO u ON u.dni_perfil = P.DNI
             ${whereSql}`,
            params
        );
        const total = countRows[0].total;

        const perfiles = await db.query(
            `SELECT P.*, u.rol
             FROM PERFIL P
             LEFT JOIN USUARIO u ON u.dni_perfil = P.DNI
             ${whereSql}
             ORDER BY P.DNI DESC
             LIMIT ? OFFSET ?`,
            [...params, limit, offset]
        );

        if (!perfiles.length) {
            return res.json({
                data: [],
                pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
            });
        }

        const dnis = perfiles.map((p) => p.DNI);
        const { brevetesMap, educacionMap, certMap } = await cargarRelacionadosPorDnis(dnis);

        const data = perfiles.map((row) =>
            formatearPerfilPorRol(
                row,
                brevetesMap.get(row.DNI) || [],
                educacionMap.get(row.DNI) || [],
                certMap.get(row.DNI) || [],
            )
        );

        res.json({
            data,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

/** Detalle de personal por DNI (mismo formato que /personal) */
exports.getPersonalById = async (req, res) => {
    try {
        const perfil = await obtenerPerfilPersonalFormateado(req.params.id);
        if (!perfil) return res.status(404).json({ error: 'No encontrado' });
        res.json(perfil);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

/** Crear perfil usando el DNI del path; responde con formato /personal */
exports.createPersonalById = async (req, res) => {
    const dni = req.params.id;
    const {
        Nombre, Apellido, Genero, RUC, fecha_nacimiento, correo_contacto,
        telefono_contacto, estado_civil, distrito_residencia, seguro_vida_ley,
        aficiones, experiencia, comentarios, estado, alergias, condicion_medica,
        profesion, nro_cta_bancaria,
    } = req.body;

    try {
        if (!Nombre || !Apellido) {
            return res.status(400).json({ error: 'Nombre y Apellido son requeridos' });
        }

        const existente = await db.query('SELECT DNI FROM PERFIL WHERE DNI = ?', [dni]);
        if (existente.length) {
            return res.status(409).json({ error: 'Ya existe un perfil con ese DNI' });
        }

        await db.query(
            `INSERT INTO PERFIL (DNI,Nombre,Apellido,Genero,RUC,fecha_nacimiento,
             correo_contacto,telefono_contacto,estado_civil,distrito_residencia,
             seguro_vida_ley,aficiones,experiencia,comentarios,estado,alergias,
             condicion_medica,profesion,nro_cta_bancaria)
             VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
            [dni, Nombre, Apellido, Genero, RUC, fecha_nacimiento, correo_contacto,
             telefono_contacto, estado_civil, distrito_residencia, seguro_vida_ley,
             aficiones, experiencia, comentarios, estado, alergias, condicion_medica,
             profesion, nro_cta_bancaria]
        );

        const perfil = await obtenerPerfilPersonalFormateado(dni);
        res.status(201).json(perfil);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

/** Actualizar perfil por DNI; responde con formato /personal */
exports.updatePersonalById = async (req, res) => {
    const dni = req.params.id;
    const {
        Nombre, Apellido, Genero, RUC, fecha_nacimiento, correo_contacto,
        telefono_contacto, estado_civil, distrito_residencia, seguro_vida_ley,
        aficiones, experiencia, comentarios, estado, alergias, condicion_medica,
        profesion, nro_cta_bancaria,
    } = req.body;

    try {
        const result = await db.query(
            `UPDATE PERFIL SET Nombre=?,Apellido=?,Genero=?,RUC=?,fecha_nacimiento=?,
             correo_contacto=?,telefono_contacto=?,estado_civil=?,distrito_residencia=?,
             seguro_vida_ley=?,aficiones=?,experiencia=?,comentarios=?,estado=?,
             alergias=?,condicion_medica=?,profesion=?,nro_cta_bancaria=?
             WHERE DNI=?`,
            [Nombre, Apellido, Genero, RUC, fecha_nacimiento, correo_contacto,
             telefono_contacto, estado_civil, distrito_residencia, seguro_vida_ley,
             aficiones, experiencia, comentarios, estado, alergias, condicion_medica,
             profesion, nro_cta_bancaria, dni]
        );
        if (result.affectedRows === 0) return res.status(404).json({ error: 'No encontrado' });

        const perfil = await obtenerPerfilPersonalFormateado(dni);
        res.json(perfil);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

exports.getById = async (req, res) => {
    try {
        const rows = await db.query('SELECT * FROM PERFIL WHERE DNI = ?', [req.params.dni]);
        if (!rows.length) return res.status(404).json({ error: 'No encontrado' });
        res.json(rows[0]);
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.create = async (req, res) => {
    const { DNI, Nombre, Apellido, Genero, RUC, fecha_nacimiento, correo_contacto,
        telefono_contacto, estado_civil, distrito_residencia, seguro_vida_ley,
        aficiones, experiencia, comentarios, estado, alergias, condicion_medica,
        profesion, nro_cta_bancaria } = req.body;
    try {
        await db.query(
            `INSERT INTO PERFIL (DNI,Nombre,Apellido,Genero,RUC,fecha_nacimiento,
             correo_contacto,telefono_contacto,estado_civil,distrito_residencia,
             seguro_vida_ley,aficiones,experiencia,comentarios,estado,alergias,
             condicion_medica,profesion,nro_cta_bancaria)
             VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
            [DNI, Nombre, Apellido, Genero, RUC, fecha_nacimiento, correo_contacto,
             telefono_contacto, estado_civil, distrito_residencia, seguro_vida_ley,
             aficiones, experiencia, comentarios, estado, alergias, condicion_medica,
             profesion, nro_cta_bancaria]
        );
        res.status(201).json({ message: 'Perfil creado', DNI });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.update = async (req, res) => {
    const { Nombre, Apellido, Genero, RUC, fecha_nacimiento, correo_contacto,
        telefono_contacto, estado_civil, distrito_residencia, seguro_vida_ley,
        aficiones, experiencia, comentarios, estado, alergias, condicion_medica,
        profesion, nro_cta_bancaria } = req.body;
    try {
        const result = await db.query(
            `UPDATE PERFIL SET Nombre=?,Apellido=?,Genero=?,RUC=?,fecha_nacimiento=?,
             correo_contacto=?,telefono_contacto=?,estado_civil=?,distrito_residencia=?,
             seguro_vida_ley=?,aficiones=?,experiencia=?,comentarios=?,estado=?,
             alergias=?,condicion_medica=?,profesion=?,nro_cta_bancaria=?
             WHERE DNI=?`,
            [Nombre, Apellido, Genero, RUC, fecha_nacimiento, correo_contacto,
             telefono_contacto, estado_civil, distrito_residencia, seguro_vida_ley,
             aficiones, experiencia, comentarios, estado, alergias, condicion_medica,
             profesion, nro_cta_bancaria, req.params.dni]
        );
        if (result.affectedRows === 0) return res.status(404).json({ error: 'No encontrado' });
        res.json({ message: 'Perfil actualizado' });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.remove = async (req, res) => {
    try {
        const result = await db.query('DELETE FROM PERFIL WHERE DNI = ?', [req.params.dni]);
        if (result.affectedRows === 0) return res.status(404).json({ error: 'No encontrado' });
        res.json({ message: 'Perfil eliminado' });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

// ── ARCHIVOS DE PERFIL (PDFs e Imágenes) ──────────────────────────────────
const fs = require('fs');
const path = require('path');

const handleFileUpload = async (req, res, table, idColumn, idValue, fileColumn, successMsg, subdir) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No se subió ningún archivo' });

        const rows = await db.query(`SELECT ${fileColumn} FROM ${table} WHERE ${idColumn} = ?`, [idValue]);
        if (!rows.length) {
            fs.unlinkSync(req.file.path);
            return res.status(404).json({ error: 'Registro no encontrado' });
        }

        // Borrar archivo anterior si existe (la BD guarda URL relativa, lo convertimos a ruta absoluta para borrarlo)
        const oldUrl = rows[0][fileColumn];
        if (oldUrl) {
            const oldAbsPath = path.join(__dirname, '../../', oldUrl);
            if (fs.existsSync(oldAbsPath)) {
                try { fs.unlinkSync(oldAbsPath); } catch (err) { console.error("No se pudo borrar el archivo antiguo:", err); }
            }
        }

        // Guardar URL relativa (ej: /uploads/pdfs/doc_123.pdf) en lugar del path absoluto del disco
        const relativeUrl = `/uploads/${subdir}/${req.file.filename}`;
        await db.query(`UPDATE ${table} SET ${fileColumn} = ? WHERE ${idColumn} = ?`, [relativeUrl, idValue]);
        res.status(200).json({ message: successMsg, url: relativeUrl });
    } catch (e) {
        if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        res.status(500).json({ error: e.message });
    }
};

const handleFileGet = async (req, res, table, idColumn, idValue, fileColumn) => {
    try {
        const rows = await db.query(`SELECT ${fileColumn} FROM ${table} WHERE ${idColumn} = ?`, [idValue]);
        if (!rows.length) return res.status(404).json({ error: 'Registro no encontrado' });

        const fileUrl = rows[0][fileColumn];
        if (!fileUrl) {
            return res.status(404).json({ error: 'Archivo no encontrado' });
        }

        // Redirigir al cliente a la URL pública (servida por express.static)
        res.redirect(fileUrl);
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.uploadCV = (req, res) => handleFileUpload(req, res, 'PERFIL', 'DNI', req.params.dni, 'cv', 'CV subido', 'pdfs');
exports.getCV = (req, res) => handleFileGet(req, res, 'PERFIL', 'DNI', req.params.dni, 'cv');

exports.uploadFotoPerfil = (req, res) => handleFileUpload(req, res, 'PERFIL', 'DNI', req.params.dni, 'foto_perfil', 'Foto de perfil subida', 'images');
exports.getFotoPerfil = (req, res) => handleFileGet(req, res, 'PERFIL', 'DNI', req.params.dni, 'foto_perfil');

exports.uploadBrevetePDF = (req, res) => handleFileUpload(req, res, 'PERFIL_BREVETE', 'id', req.params.id, 'pdf_brevete', 'Brevete subido', 'pdfs');
exports.getBrevetePDF = (req, res) => handleFileGet(req, res, 'PERFIL_BREVETE', 'id', req.params.id, 'pdf_brevete');

exports.uploadCertificacionPDF = (req, res) => handleFileUpload(req, res, 'PERFIL_CERTIFICACION', 'id', req.params.id, 'pdf_certificacion', 'Certificación subida', 'pdfs');
exports.getCertificacionPDF = (req, res) => handleFileGet(req, res, 'PERFIL_CERTIFICACION', 'id', req.params.id, 'pdf_certificacion');

// ── PERFIL_EDUCACION ──────────────────────────────────────────────────────────
exports.getEducacion = async (req, res) => {
    try {
        const rows = await db.query('SELECT * FROM PERFIL_EDUCACION WHERE DNI_perfil = ? ORDER BY id DESC', [req.params.dni]);
        res.json(rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.createEducacion = async (req, res) => {
    const { nombre_educacion, nivel_educacion, institucion } = req.body;
    try {
        const result = await db.query(
            'INSERT INTO PERFIL_EDUCACION (DNI_perfil,nombre_educacion,nivel_educacion,institucion) VALUES (?,?,?,?)',
            [req.params.dni, nombre_educacion, nivel_educacion, institucion]
        );
        res.status(201).json({ message: 'Educación creada', id: result.insertId });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.updateEducacion = async (req, res) => {
    const { nombre_educacion, nivel_educacion, institucion } = req.body;
    try {
        const result = await db.query(
            'UPDATE PERFIL_EDUCACION SET nombre_educacion=?,nivel_educacion=?,institucion=? WHERE id=? AND DNI_perfil=?',
            [nombre_educacion, nivel_educacion, institucion, req.params.id, req.params.dni]
        );
        if (result.affectedRows === 0) return res.status(404).json({ error: 'No encontrado' });
        res.json({ message: 'Educación actualizada' });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.deleteEducacion = async (req, res) => {
    try {
        const result = await db.query(
            'DELETE FROM PERFIL_EDUCACION WHERE id=? AND DNI_perfil=?', [req.params.id, req.params.dni]
        );
        if (result.affectedRows === 0) return res.status(404).json({ error: 'No encontrado' });
        res.json({ message: 'Educación eliminada' });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

// ── PERFIL_BREVETE ────────────────────────────────────────────────────────────
exports.getBrevete = async (req, res) => {
    try {
        const rows = await db.query('SELECT * FROM PERFIL_BREVETE WHERE DNI_perfil = ? ORDER BY id DESC', [req.params.dni]);
        res.json(rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.createBrevete = async (req, res) => {
    const { categoria, fecha_vencimiento } = req.body;
    try {
        const result = await db.query(
            'INSERT INTO PERFIL_BREVETE (DNI_perfil,categoria,fecha_vencimiento) VALUES (?,?,?)',
            [req.params.dni, categoria, fecha_vencimiento]
        );
        res.status(201).json({ message: 'Brevete creado', id: result.insertId });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.updateBrevete = async (req, res) => {
    const { categoria, fecha_vencimiento } = req.body;
    try {
        const result = await db.query(
            'UPDATE PERFIL_BREVETE SET categoria=?,fecha_vencimiento=? WHERE id=? AND DNI_perfil=?',
            [categoria, fecha_vencimiento, req.params.id, req.params.dni]
        );
        if (result.affectedRows === 0) return res.status(404).json({ error: 'No encontrado' });
        res.json({ message: 'Brevete actualizado' });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.deleteBrevete = async (req, res) => {
    try {
        const result = await db.query(
            'DELETE FROM PERFIL_BREVETE WHERE id=? AND DNI_perfil=?', [req.params.id, req.params.dni]
        );
        if (result.affectedRows === 0) return res.status(404).json({ error: 'No encontrado' });
        res.json({ message: 'Brevete eliminado' });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

// ── PERFIL_CERTIFICACION ──────────────────────────────────────────────────────
exports.getCertificacion = async (req, res) => {
    try {
        const rows = await db.query('SELECT * FROM PERFIL_CERTIFICACION WHERE DNI_perfil = ? ORDER BY id DESC', [req.params.dni]);
        res.json(rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.createCertificacion = async (req, res) => {
    const { nombre, institucion, fecha_validez } = req.body;
    try {
        const result = await db.query(
            'INSERT INTO PERFIL_CERTIFICACION (DNI_perfil,nombre,institucion,fecha_validez) VALUES (?,?,?,?)',
            [req.params.dni, nombre, institucion, fecha_validez]
        );
        res.status(201).json({ message: 'Certificación creada', id: result.insertId });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.updateCertificacion = async (req, res) => {
    const { nombre, institucion, fecha_validez } = req.body;
    try {
        const result = await db.query(
            'UPDATE PERFIL_CERTIFICACION SET nombre=?,institucion=?,fecha_validez=? WHERE id=? AND DNI_perfil=?',
            [nombre, institucion, fecha_validez, req.params.id, req.params.dni]
        );
        if (result.affectedRows === 0) return res.status(404).json({ error: 'No encontrado' });
        res.json({ message: 'Certificación actualizada' });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.deleteCertificacion = async (req, res) => {
    try {
        const result = await db.query(
            'DELETE FROM PERFIL_CERTIFICACION WHERE id=? AND DNI_perfil=?', [req.params.id, req.params.dni]
        );
        if (result.affectedRows === 0) return res.status(404).json({ error: 'No encontrado' });
        res.json({ message: 'Certificación eliminada' });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.getTrabajadoresDisponibles = async (req, res) => {
    const { fecha } = req.query;
    try {
        if (!fecha) {
            return res.status(400).json({ error: 'Se requiere el parámetro fecha (YYYY-MM-DD)' });
        }

        const sql = `
            SELECT p.DNI as dni, p.Nombre as nombre, p.Apellido as apellidos, u.rol
            FROM PERFIL p
            JOIN USUARIO u ON p.DNI = u.dni_perfil
            WHERE (LOWER(u.rol) IN ('supervisorcampo', 'trabajtaller', 'trabajcampo'))
            AND p.DNI NOT IN (
                SELECT DNI_Trabajador 
                FROM TRABAJO_JORNADA 
                WHERE dia = ?
            )
            ORDER BY p.DNI DESC
        `;
        const rows = await db.query(sql, [fecha]);
        res.json(rows);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

exports.getConductoresDisponibles = async (req, res) => {
    const { fecha } = req.query;
    try {
        if (!fecha) {
            return res.status(400).json({ error: 'Se requiere el parámetro fecha (YYYY-MM-DD)' });
        }

        // Buscamos perfiles que:
        // 1. Tengan al menos un registro en PERFIL_BREVETE (tienen licencia)
        // 2. No tengan una jornada asignada en la fecha indicada en TRABAJO_JORNADA
        // 3. Tengan uno de los roles solicitados
        const sql = `
            SELECT DISTINCT p.DNI, p.Nombre, p.Apellido, u.rol, p.estado
            FROM PERFIL p
            JOIN PERFIL_BREVETE b ON p.DNI = b.DNI_perfil
            LEFT JOIN USUARIO u ON p.DNI = u.dni_perfil
            WHERE (LOWER(u.rol) IN ('supervisorcampo', 'trabajtaller', 'trabajcampo'))
            AND p.DNI NOT IN (
                SELECT DNI_Trabajador 
                FROM TRABAJO_JORNADA 
                WHERE dia = ?
            )
            ORDER BY p.DNI DESC
        `;
        const rows = await db.query(sql, [fecha]);
        res.json(rows);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

// ── RELACIONES VÍA CLIENTE_CONTACTO ───────────────────────────────────────────
exports.getSolicitudesPorPerfil = async (req, res) => {
    try {
        const sql = `
            SELECT S.* 
            FROM SOLICITUD S
            JOIN CLIENTE_CONTACTO CC ON S.Id_Cliente = CC.DNI_O_RUC
            WHERE CC.DNI_perfil = ?
            ORDER BY S.ID DESC`;
        res.json(await db.query(sql, [req.params.dni]));
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.getCotizacionesPorPerfil = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;
        const { estado, nombre } = req.query;

        const filterClauses = [];
        const filterArgs = [];
        if (estado) {
            filterClauses.push('C.estado = ?');
            filterArgs.push(estado);
        }
        if (nombre) {
            filterClauses.push('C.nombre LIKE ?');
            filterArgs.push(`%${nombre}%`);
        }
        const extraWhere = filterClauses.length ? ` AND ${filterClauses.join(' AND ')}` : '';

        const countSql = `
            SELECT COUNT(*) as total 
            FROM COTIZACION_COMERCIAL C
            JOIN CLIENTE_CONTACTO CC ON C.DNI_O_RUC = CC.DNI_O_RUC
            WHERE CC.DNI_perfil = ?${extraWhere}`;
        const countResult = await db.query(countSql, [req.params.dni, ...filterArgs]);
        const total = countResult[0].total;

        const sql = `
            SELECT C.*, CL.nombre_comercial as Cliente_Nombre 
            FROM COTIZACION_COMERCIAL C
            JOIN CLIENTE_CONTACTO CC ON C.DNI_O_RUC = CC.DNI_O_RUC
            LEFT JOIN CLIENTE CL ON C.DNI_O_RUC = CL.DNI_O_RUC
            WHERE CC.DNI_perfil = ?${extraWhere}
            ORDER BY C.ID DESC
            LIMIT ? OFFSET ?`;
        const rows = await db.query(sql, [req.params.dni, ...filterArgs, limit, offset]);

        res.json({
            data: rows.map(r => formatQuotation(r, req.user ? req.user.rolNormalizado : null)),
            pagination: { total, page, limit, totalPages: Math.ceil(total / limit) }
        });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.getProyectosPorPerfil = async (req, res) => {
    try {
        const sql = `
            SELECT P.* 
            FROM PROYECTO P
            JOIN CLIENTE_CONTACTO CC ON P.Id_Cliente = CC.DNI_O_RUC
            WHERE CC.DNI_perfil = ?
            ORDER BY P.id_Proyecto DESC`;
        res.json(await db.query(sql, [req.params.dni]));
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.getIncidenciasPorPerfil = async (req, res) => {
    try {
        const sql = `
            SELECT I.* 
            FROM INCIDENCIA I
            JOIN CLIENTE_CONTACTO CC ON I.empresa_involucrada = CC.DNI_O_RUC
            WHERE CC.DNI_perfil = ?
            ORDER BY I.id_incidencia DESC`;
        res.json(await db.query(sql, [req.params.dni]));
    } catch (e) { res.status(500).json({ error: e.message }); }
};

// ── TABLAS CON PK DE PERFIL ───────────────────────────────────────────────────
exports.getTrabajosJornadaPorPerfil = async (req, res) => {
    try { res.json(await db.query('SELECT * FROM TRABAJO_JORNADA WHERE DNI_Trabajador = ? ORDER BY id DESC', [req.params.dni])); }
    catch (e) { res.status(500).json({ error: e.message }); }
};

exports.getTrabajosRRHHPorPerfil = async (req, res) => {
    try { res.json(await db.query('SELECT * FROM TRABAJO_RRHH WHERE DNI_Trabajador = ? ORDER BY id DESC', [req.params.dni])); }
    catch (e) { res.status(500).json({ error: e.message }); }
};

exports.getInvolucradoPorPerfil = async (req, res) => {
    try { res.json(await db.query('SELECT * FROM INVOLUCRADO WHERE dni_involucrado = ? ORDER BY id DESC', [req.params.dni])); }
    catch (e) { res.status(500).json({ error: e.message }); }
};

exports.getCredencialesRRHHPorPerfil = async (req, res) => {
    try { res.json(await db.query('SELECT * FROM PERFIL_CREDENCIALES_RRHH WHERE DNI_perfil = ? ORDER BY id DESC', [req.params.dni])); }
    catch (e) { res.status(500).json({ error: e.message }); }
};

exports.getEmpresasContactoPorPerfil = async (req, res) => {
    try { 
        const sql = `
            SELECT C.*, CC.cargo_en_empresa, CC.lugar_trabajo
            FROM CLIENTE C
            JOIN CLIENTE_CONTACTO CC ON C.DNI_O_RUC = CC.DNI_O_RUC
            WHERE CC.DNI_perfil = ?
            ORDER BY CC.id DESC`;
        res.json(await db.query(sql, [req.params.dni])); 
    }
    catch (e) { res.status(500).json({ error: e.message }); }
};
