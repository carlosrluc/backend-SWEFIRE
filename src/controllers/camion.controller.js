const db = require('../config/db');
const { withTx, moveCamionToTallerAll, restoreCamionFromTaller, moveTallerToCamion, moveCamionToTaller, removeCamionInventarioItem } = require('../services/inventarioStock.service');

const autoUpdateCamionStatus = async () => {
    try {
        await db.query(`
            UPDATE CAMION c
            SET c.Estado = CASE
                WHEN c.vencimiento_tarjeta < CURDATE() THEN 'Tarjeta Vencida'
                WHEN EXISTS (
                    SELECT 1 FROM PROYECTO_CAMION pc 
                    WHERE pc.Placa = c.Placa 
                    AND NOW() >= pc.fecha_hora_entrada AND NOW() <= pc.fecha_hora_salida
                ) THEN 'Ocupado'
                WHEN c.Estado IN ('Ocupado', 'Tarjeta Vencida') THEN 'Operacional'
                ELSE c.Estado
            END
            WHERE c.Estado IN ('Operacional', 'Ocupado', 'Tarjeta Vencida')
               OR c.vencimiento_tarjeta < CURDATE()
        `);
    } catch (e) {
        console.error('Error auto-actualizando estados de camiones:', e);
    }
};

// ── CAMION ────────────────────────────────────────────────────────────────────
exports.getAll = async (req, res) => {
    try {
        await autoUpdateCamionStatus();

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;

        const rows = await db.query(
            `SELECT C.*, F.nombre_comercial as Fabricante_Nombre 
             FROM CAMION C 
             LEFT JOIN FABRICANTE F ON C.ID_Fabricante = F.ID_Fabricante 
             LIMIT ? OFFSET ?`,
            [limit, offset]
        );

        // Enriquecer cada camión de la lista
        const enrichedData = await Promise.all(rows.map(async (camion) => {
            let proyecto_actual = null;
            if (camion.Estado === 'Ocupado') {
                const currentProj = await db.query(
                    `SELECT 
                        PC.fecha_hora_entrada, 
                        PC.fecha_hora_salida,
                        CLI.nombre_comercial AS cliente_nombre,
                        COT.nombre AS cotizacion_nombre
                     FROM PROYECTO_CAMION PC
                     JOIN PROYECTO P ON PC.id_Proyecto = P.id_Proyecto
                     LEFT JOIN CLIENTE CLI ON P.Id_Cliente = CLI.DNI_O_RUC
                     LEFT JOIN COTIZACION_COMERCIAL COT ON P.id_cotizacion = COT.ID
                     WHERE PC.Placa = ? 
                     AND NOW() >= PC.fecha_hora_entrada 
                     AND NOW() <= PC.fecha_hora_salida
                     LIMIT 1`,
                     [camion.Placa]
                );
                if (currentProj.length > 0) {
                    proyecto_actual = currentProj[0];
                }
            }

            const futuros = await db.query(
                `SELECT fecha_hora_entrada, fecha_hora_salida 
                 FROM PROYECTO_CAMION 
                 WHERE Placa = ? AND fecha_hora_entrada > NOW()
                 ORDER BY fecha_hora_entrada ASC`,
                 [camion.Placa]
            );

            return {
                ...camion,
                proyecto_actual,
                programacion_futura: futuros
            };
        }));

        const countResult = await db.query('SELECT COUNT(*) as total FROM CAMION');
        const total = countResult[0].total;

        res.json({
            data: enrichedData,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.getByPlaca = async (req, res) => {
    try {
        await autoUpdateCamionStatus();

        const rows = await db.query(
            `SELECT C.*, F.nombre_comercial as Fabricante_Nombre 
             FROM CAMION C 
             LEFT JOIN FABRICANTE F ON C.ID_Fabricante = F.ID_Fabricante 
             WHERE C.Placa = ?`,
            [req.params.placa]
        );
        if (!rows.length) return res.status(404).json({ error: 'No encontrado' });
        
        const camion = rows[0];

        // Obtener datos del proyecto actual si está ocupado
        let proyecto_actual = null;
        if (camion.Estado === 'Ocupado') {
            const currentProj = await db.query(
                `SELECT 
                    PC.fecha_hora_entrada, 
                    PC.fecha_hora_salida,
                    CLI.nombre_comercial AS cliente_nombre,
                    COT.nombre AS cotizacion_nombre
                 FROM PROYECTO_CAMION PC
                 JOIN PROYECTO P ON PC.id_Proyecto = P.id_Proyecto
                 LEFT JOIN CLIENTE CLI ON P.Id_Cliente = CLI.DNI_O_RUC
                 LEFT JOIN COTIZACION_COMERCIAL COT ON P.id_cotizacion = COT.ID
                 WHERE PC.Placa = ? 
                 AND NOW() >= PC.fecha_hora_entrada 
                 AND NOW() <= PC.fecha_hora_salida
                 LIMIT 1`,
                 [req.params.placa]
            );
            if (currentProj.length > 0) {
                proyecto_actual = currentProj[0];
            }
        }

        // Obtener matriz de fechas futuras
        const futuros = await db.query(
            `SELECT fecha_hora_entrada, fecha_hora_salida 
             FROM PROYECTO_CAMION 
             WHERE Placa = ? AND fecha_hora_entrada > NOW()
             ORDER BY fecha_hora_entrada ASC`,
             [req.params.placa]
        );

        camion.proyecto_actual = proyecto_actual;
        camion.programacion_futura = futuros;

        res.json(camion);
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.create = async (req, res) => {
    const { Placa, nombre, ano_fabricacion, modelo, color, caracteristicas,
        fecha_prox_revision, ID_Fabricante,
        vencimiento_tarjeta, soat_n_poliza, soat_empresa, soat_precio, soat_dia_pago, Estado } = req.body;
    try {
        await db.query(
            `INSERT INTO CAMION (Placa,nombre,ano_fabricacion,modelo,color,caracteristicas,
             fecha_prox_revision,ID_Fabricante,vencimiento_tarjeta,soat_n_poliza,
             soat_empresa,soat_precio,soat_dia_pago,Estado) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
            [Placa, nombre, ano_fabricacion, modelo, color, caracteristicas,
                fecha_prox_revision, ID_Fabricante, vencimiento_tarjeta,
                soat_n_poliza, soat_empresa, soat_precio, soat_dia_pago, Estado]
        );
        res.status(201).json({ message: 'Camión creado', Placa });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.update = async (req, res) => {
    const { nombre, ano_fabricacion, modelo, color, caracteristicas,
        fecha_prox_revision, ID_Fabricante, vencimiento_tarjeta,
        soat_n_poliza, soat_empresa, soat_precio, soat_dia_pago, Estado } = req.body;
    try {
        const placa = req.params.placa;

        const out = await withTx(db, async (conn) => {
            const before = await conn.query('SELECT Estado FROM CAMION WHERE Placa = ? FOR UPDATE', [placa]);
            if (!before.length) return { notFound: true };
            const estadoAnterior = before[0].Estado;

            const result = await conn.query(
                `UPDATE CAMION SET nombre=?,ano_fabricacion=?,modelo=?,color=?,caracteristicas=?,
                 fecha_prox_revision=?,ID_Fabricante=?,vencimiento_tarjeta=?,soat_n_poliza=?,
                 soat_empresa=?,soat_precio=?,soat_dia_pago=?,Estado=? WHERE Placa=?`,
                [nombre, ano_fabricacion, modelo, color, caracteristicas,
                    fecha_prox_revision, ID_Fabricante, vencimiento_tarjeta,
                    soat_n_poliza, soat_empresa, soat_precio, soat_dia_pago, Estado, placa]
            );
            if (result.affectedRows === 0) return { notFound: true };

            // Transiciones de estado: En mantenimiento / Descalificado
            const restricted = new Set(['En mantenimiento', 'Descalificado']);
            const entroRestriccion = Estado && restricted.has(Estado) && !restricted.has(estadoAnterior);
            const salioRestriccion = Estado && !restricted.has(Estado) && restricted.has(estadoAnterior);

            if (entroRestriccion) {
                // Regla: todo inventario del camión vuelve al taller (solo CAMION_INVENTARIO)
                await moveCamionToTallerAll(conn, { Placa: placa, estado_origen: Estado, razon: `Camión pasó a estado ${Estado}` });
            }

            if (salioRestriccion) {
                // Regla: al salir, todo su inventario vuelve al camión desde el taller (según retenciones)
                await restoreCamionFromTaller(conn, { Placa: placa, razon: `Camión salió de estado ${estadoAnterior}` });
            }

            return { ok: true };
        });

        if (out?.notFound) return res.status(404).json({ error: 'No encontrado' });
        res.json({ message: 'Camión actualizado' });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.remove = async (req, res) => {
    try {
        const result = await db.query('DELETE FROM CAMION WHERE Placa = ?', [req.params.placa]);
        if (result.affectedRows === 0) return res.status(404).json({ error: 'No encontrado' });
        res.json({ message: 'Camión eliminado' });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

// ── ARCHIVOS DE CAMION (PDFs) ────────────────────────────────────────────────
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

exports.uploadRevisionTecnica = (req, res) => handleFileUpload(req, res, 'CAMION', 'Placa', req.params.placa, 'revision_tecnica', 'Revisión técnica subida', 'pdfs');
exports.getRevisionTecnica = (req, res) => handleFileGet(req, res, 'CAMION', 'Placa', req.params.placa, 'revision_tecnica');

exports.uploadTarjetaPropiedad = (req, res) => handleFileUpload(req, res, 'CAMION', 'Placa', req.params.placa, 'tarjeta_propiedad', 'Tarjeta de propiedad subida', 'pdfs');
exports.getTarjetaPropiedad = (req, res) => handleFileGet(req, res, 'CAMION', 'Placa', req.params.placa, 'tarjeta_propiedad');


// ── CAMION_MANTENIMIENTO ──────────────────────────────────────────────────────
exports.getMantenimientos = async (req, res) => {
    try { res.json(await db.query('SELECT * FROM CAMION_MANTENIMIENTO WHERE Placa = ?', [req.params.placa])); }
    catch (e) { res.status(500).json({ error: e.message }); }
};

exports.createMantenimiento = async (req, res) => {
    const { fecha_ultimo_mant, responsable, razon, contacto_responsable } = req.body;
    try {
        const result = await db.query(
            'INSERT INTO CAMION_MANTENIMIENTO (Placa,fecha_ultimo_mant,responsable,razon,contacto_responsable) VALUES (?,?,?,?,?)',
            [req.params.placa, fecha_ultimo_mant, responsable, razon, contacto_responsable]
        );
        res.status(201).json({ message: 'Mantenimiento creado', id: result.insertId });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.uploadMantenimientoPDF = (req, res) => handleFileUpload(req, res, 'CAMION_MANTENIMIENTO', 'id', req.params.mid, 'pdf_mantenimiento', 'PDF de mantenimiento subido', 'pdfs');
exports.getMantenimientoPDF = (req, res) => handleFileGet(req, res, 'CAMION_MANTENIMIENTO', 'id', req.params.mid, 'pdf_mantenimiento');

exports.deleteMantenimiento = async (req, res) => {
    try {
        const result = await db.query(
            'DELETE FROM CAMION_MANTENIMIENTO WHERE id=? AND Placa=?', [req.params.mid, req.params.placa]
        );
        if (result.affectedRows === 0) return res.status(404).json({ error: 'No encontrado' });
        res.json({ message: 'Mantenimiento eliminado' });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

// ── CAMION_INVENTARIO ─────────────────────────────────────────────────────────
exports.getCamionInventario = async (req, res) => {
    try { res.json(await db.query('SELECT CI.*, I.nombre_objeto as Objeto_Nombre FROM CAMION_INVENTARIO CI LEFT JOIN INVENTARIO I ON CI.Id_Objeto = I.Id_Objeto WHERE CI.Placa = ?', [req.params.placa])); }
    catch (e) { res.status(500).json({ error: e.message }); }
};

exports.createCamionInventario = async (req, res) => {
    const { Id_Objeto, cantidad_requerida, cantidad_actual, ubicacion_en_camion, requerido_legal, razon } = req.body;
    try {
        const placa = req.params.placa;
        const out = await withTx(db, async (conn) => {
            const result = await conn.query(
                'INSERT INTO CAMION_INVENTARIO (Placa,Id_Objeto,cantidad_requerida,cantidad_actual,ubicacion_en_camion,requerido_legal) VALUES (?,?,?,?,?,?)',
                [placa, Id_Objeto, cantidad_requerida || 0, 0, ubicacion_en_camion, requerido_legal || 'no']
            );

            // Si se está cargando cantidad_actual al crear, esto implica salida desde taller
            const qty = Number(cantidad_actual || 0);
            if (qty > 0) {
                await moveTallerToCamion(conn, {
                    Placa: placa,
                    Id_Objeto,
                    cantidad: qty,
                    razon: razon || 'Asignación a camión',
                    referencia_id: result.insertId,
                });
            }

            return { id: result.insertId };
        });
        res.status(201).json({ message: 'Ítem de inventario añadido al camión', id: out.id });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.deleteCamionInventario = async (req, res) => {
    try {
        const placa = req.params.placa;
        const iid = Number(req.params.iid);
        const { razon } = req.body || {};

        const out = await withTx(db, async (conn) =>
            removeCamionInventarioItem(conn, {
                Placa: placa,
                camion_inventario_id: iid,
                razon: razon || 'Eliminación de ítem del inventario del camión',
            }),
        );

        if (out.notFound) return res.status(404).json({ error: 'No encontrado' });
        res.json({
            message: 'Ítem de inventario eliminado del camión',
            cantidad_retornada_taller: out.cantidad_retornada,
        });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.updateCamionInventario = async (req, res) => {
    const { cantidad_requerida, cantidad_actual, ubicacion_en_camion, requerido_legal, razon } = req.body;
    try {
        const placa = req.params.placa;
        const iid = Number(req.params.iid);

        const out = await withTx(db, async (conn) => {
            // bloquear estado del camión
            const cRows = await conn.query('SELECT Estado FROM CAMION WHERE Placa = ? FOR UPDATE', [placa]);
            if (!cRows.length) return { notFound: true };
            const estadoCamion = cRows[0].Estado;
            if (estadoCamion === 'En mantenimiento' || estadoCamion === 'Descalificado') {
                return { forbidden: true, estadoCamion };
            }

            // bloquear item
            const itemRows = await conn.query(
                'SELECT id, Id_Objeto, cantidad_actual FROM CAMION_INVENTARIO WHERE id = ? AND Placa = ? FOR UPDATE',
                [iid, placa]
            );
            if (!itemRows.length) return { itemNotFound: true };
            const item = itemRows[0];
            const beforeQty = Number(item.cantidad_actual || 0);

            // actualizar campos no-cantidad primero
            const r = await conn.query(
                `UPDATE CAMION_INVENTARIO
                 SET cantidad_requerida = ?, ubicacion_en_camion = ?, requerido_legal = ?
                 WHERE id = ? AND Placa = ?`,
                [cantidad_requerida, ubicacion_en_camion, requerido_legal, iid, placa]
            );
            if (r.affectedRows === 0) return { itemNotFound: true };

            // si se envía cantidad_actual, aplicarla como delta con movimientos automáticos
            if (cantidad_actual !== undefined && cantidad_actual !== null) {
                const afterQty = Number(cantidad_actual);
                const diff = afterQty - beforeQty;
                if (diff > 0) {
                    await moveTallerToCamion(conn, {
                        Placa: placa,
                        Id_Objeto: item.Id_Objeto,
                        cantidad: diff,
                        razon: razon || 'Ajuste de cantidad en camión (incremento)',
                        referencia_id: iid,
                    });
                } else if (diff < 0) {
                    await moveCamionToTaller(conn, {
                        Placa: placa,
                        Id_Objeto: item.Id_Objeto,
                        cantidad: Math.abs(diff),
                        razon: razon || 'Ajuste de cantidad en camión (decremento)',
                        referencia_id: iid,
                    });
                }
            }

            return { ok: true };
        });

        if (out?.notFound) return res.status(404).json({ error: 'Camión no encontrado' });
        if (out?.itemNotFound) return res.status(404).json({ error: 'Ítem de inventario del camión no encontrado' });
        if (out?.forbidden) return res.status(409).json({ error: `No se puede ajustar inventario: camión está en estado ${out.estadoCamion}` });
        res.json({ message: 'Ítem de inventario del camión actualizado' });
    } catch (e) { res.status(500).json({ error: e.message }); }
};
