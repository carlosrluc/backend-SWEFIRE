const db = require('../config/db');
const { withTx } = require('./inventarioStock.service');
const { normalizeServiceItem } = require('./cotizacionDto.service');

const DUMMY_CLIENT_DNI = '00000000000';
const ENVIO_SERVICIO_ID = 7;
const DESACTUALIZADO_VIGENTE = 'NO';

function httpError(status, message) {
    const err = new Error(message);
    err.status = status;
    return err;
}

async function isServicioPermitidoIncidencia(exec, idServicio) {
    const id = Number(idServicio);
    if (id === ENVIO_SERVICIO_ID) return true;
    const rows = await exec.query(
        `SELECT ID_Servicio FROM SERVICIO
         WHERE ID_Servicio = ? AND servicio_de_incidencia = 'YES' AND Estado = 'Activo'`,
        [id],
    );
    return rows.length > 0;
}

async function assertServiciosPermitidosIncidencia(exec, serviciosList) {
    for (const raw of serviciosList || []) {
        const s = normalizeServiceItem(raw);
        if (!s.ID_Servicio) continue;
        const ok = await isServicioPermitidoIncidencia(exec, s.ID_Servicio);
        if (!ok) {
            throw httpError(
                400,
                `El servicio ${s.ID_Servicio} no está permitido en cotizaciones de incidencia`,
            );
        }
        if (raw.Principal === 'YES' || s.Principal === 'YES') {
            throw httpError(400, 'Las cotizaciones de incidencia no pueden tener servicio principal');
        }
    }
}

async function ensureClienteDummy(exec) {
    const rows = await exec.query('SELECT DNI_O_RUC FROM CLIENTE WHERE DNI_O_RUC = ?', [DUMMY_CLIENT_DNI]);
    if (rows.length) return DUMMY_CLIENT_DNI;
    await exec.query(
        `INSERT INTO CLIENTE (DNI_O_RUC, nombre_comercial, razon_social, ubicacion_facturacion, observacion)
         VALUES (?, ?, ?, ?, ?)`,
        [
            DUMMY_CLIENT_DNI,
            'Cliente no especificado',
            'Cliente no especificado',
            'Ubicación no especificada',
            'Cliente placeholder para cotizaciones de incidencia sin destinatario identificado',
        ],
    );
    return DUMMY_CLIENT_DNI;
}

async function ensureClienteFromPerfil(exec, dni) {
    const perfilRows = await exec.query('SELECT * FROM PERFIL WHERE DNI = ?', [dni]);
    if (!perfilRows.length) return null;

    const perfil = perfilRows[0];
    const dniOrRuc = perfil.DNI;
    const nombreCompleto = `${perfil.Nombre || ''} ${perfil.Apellido || ''}`.trim();

    const clienteRows = await exec.query('SELECT DNI_O_RUC FROM CLIENTE WHERE DNI_O_RUC = ?', [dniOrRuc]);
    if (!clienteRows.length) {
        await exec.query(
            `INSERT INTO CLIENTE (DNI_O_RUC, nombre_comercial, razon_social, ubicacion_facturacion, observacion)
             VALUES (?, ?, ?, ?, ?)`,
            [
                dniOrRuc,
                nombreCompleto || null,
                nombreCompleto || null,
                perfil.distrito_residencia || null,
                'Creado automáticamente desde cotización de incidencia',
            ],
        );
    }

    const contactoRows = await exec.query(
        'SELECT id FROM CLIENTE_CONTACTO WHERE DNI_O_RUC = ? AND DNI_perfil = ?',
        [dniOrRuc, perfil.DNI],
    );
    if (!contactoRows.length) {
        await exec.query(
            'INSERT INTO CLIENTE_CONTACTO (DNI_O_RUC, DNI_perfil, cargo_en_empresa, lugar_trabajo) VALUES (?,?,?,?)',
            [dniOrRuc, perfil.DNI, perfil.profesion || null, null],
        );
    }

    return { dniOrRuc, nombreCompleto, perfilDni: perfil.DNI };
}

async function resolveDestinatarioCliente(exec, idIncidencia, destinatario) {
    const { tipo, involucrado_id: involucradoId } = destinatario || {};
    if (!tipo) throw httpError(400, 'destinatario.tipo es requerido');

    const incRows = await exec.query(
        `SELECT INC.*, C.nombre_comercial AS Empresa_Nombre
         FROM INCIDENCIA INC
         LEFT JOIN CLIENTE C ON INC.empresa_involucrada = C.DNI_O_RUC
         WHERE INC.id_incidencia = ?`,
        [idIncidencia],
    );
    if (!incRows.length) throw httpError(404, 'Incidencia no encontrada');
    const incidencia = incRows[0];

    if (tipo === 'empresa') {
        if (!incidencia.empresa_involucrada) {
            throw httpError(400, 'La incidencia no tiene empresa involucrada registrada');
        }
        return {
            DNI_O_RUC: incidencia.empresa_involucrada,
            destinatarioLabel: incidencia.Empresa_Nombre || incidencia.empresa_involucrada,
            destinatarioTipo: 'empresa',
        };
    }

    if (tipo === 'no_especificado') {
        const dni = await ensureClienteDummy(exec);
        return {
            DNI_O_RUC: dni,
            destinatarioLabel: 'Cliente no especificado',
            destinatarioTipo: 'no_especificado',
        };
    }

    if (tipo === 'involucrado') {
        if (!involucradoId) throw httpError(400, 'destinatario.involucrado_id es requerido');

        const invRows = await exec.query(
            `SELECT I.*, P.Nombre AS Involucrado_Nombre, P.Apellido AS Involucrado_Apellido
             FROM INVOLUCRADO I
             LEFT JOIN PERFIL P ON I.dni_involucrado = P.DNI
             WHERE I.id = ? AND I.id_incidencia = ?`,
            [involucradoId, idIncidencia],
        );
        if (!invRows.length) throw httpError(404, 'Involucrado no encontrado en esta incidencia');
        const inv = invRows[0];

        const labelFromPerfil = inv.dni_involucrado
            ? `${inv.Involucrado_Nombre || ''} ${inv.Involucrado_Apellido || ''}`.trim()
            : (inv.nombre || 'Involucrado sin identificar');

        if (inv.dni_involucrado) {
            const resolved = await ensureClienteFromPerfil(exec, inv.dni_involucrado);
            if (resolved) {
                return {
                    DNI_O_RUC: resolved.dniOrRuc,
                    destinatarioLabel: resolved.nombreCompleto || labelFromPerfil,
                    destinatarioTipo: 'involucrado',
                    involucrado_id: involucradoId,
                };
            }
        }

        const dni = await ensureClienteDummy(exec);
        return {
            DNI_O_RUC: dni,
            destinatarioLabel: labelFromPerfil,
            destinatarioTipo: 'involucrado_sin_dni',
            involucrado_id: involucradoId,
            observacionExtra: `Destinatario indicado: ${labelFromPerfil}`,
        };
    }

    throw httpError(400, 'destinatario.tipo inválido. Use: involucrado, empresa, no_especificado');
}

async function getPresupuestoDiferenciasIncidencia(exec, idIncidencia) {
    const incRows = await exec.query(
        'SELECT id_proyecto, nombre_incidencia FROM INCIDENCIA WHERE id_incidencia = ?',
        [idIncidencia],
    );
    if (!incRows.length || !incRows[0].id_proyecto) return [];

    const projRows = await exec.query(
        'SELECT id_cotizacion FROM PROYECTO WHERE id_Proyecto = ?',
        [incRows[0].id_proyecto],
    );
    if (!projRows.length || !projRows[0].id_cotizacion) return [];

    const idCotProyecto = projRows[0].id_cotizacion;
    const presRows = await exec.query(
        `SELECT *
         FROM PRESUPUESTO
         WHERE ID_Cotizacion = ?
           AND tipo = 'Material Directo'
           AND costo_real IS NOT NULL
           AND ID_Incidencia = ?`,
        [idCotProyecto, idIncidencia],
    );

    return presRows
        .map((row) => {
            const presupuestado = Number(row.costo_total) || 0;
            const real = Number(row.costo_real) || 0;
            const diferencia = row.diferencia != null
                ? Number(row.diferencia)
                : (real - presupuestado);
            return {
                presupuesto_origen_id: row.ID,
                nombre_gasto: row.nombre_gasto,
                moneda: row.moneda || 'soles',
                costo_presupuestado: presupuestado,
                costo_real: real,
                diferencia,
            };
        })
        .filter((row) => row.diferencia !== 0);
}

async function insertPresupuestoDiferencias(exec, idCotizacion, idIncidencia, diferencias) {
    const inserted = [];
    for (const item of diferencias) {
        const monto = Math.abs(item.diferencia);
        const result = await exec.query(
            `INSERT INTO PRESUPUESTO
                (ID_Cotizacion, tipo, realizacion_gastos, nombre_gasto, costo_unitario, cantidad,
                 costo_total, moneda, ID_Incidencia, razon)
             VALUES (?, 'Material Directo', 'durante servicio', ?, ?, 1, ?, ?, ?, ?)`,
            [
                idCotizacion,
                `${item.nombre_gasto || 'Material directo'} (diferencia incidencia)`,
                monto,
                monto,
                item.moneda || 'soles',
                idIncidencia,
                `Autorrellenado desde presupuesto #${item.presupuesto_origen_id}. Diferencia: ${item.diferencia}`,
            ],
        );
        inserted.push({ id: result.insertId, ...item, monto_cotizado: monto });
    }
    return inserted;
}

async function insertServiciosIncidencia(exec, idCotizacion, serviciosList) {
    const inserted = [];
    for (const raw of serviciosList || []) {
        const s = normalizeServiceItem(raw);
        if (!s.ID_Servicio) continue;
        const ins = await exec.query(
            `INSERT INTO COTIZACION_SERVICIO
                (ID_Cotizacion, ID_Servicio, fecha_inicio, fecha_finalizacion, jornada_comienzo,
                 jornada_final, precio_comercial, Principal, indicaciones, id_servicio_subservicio)
             VALUES (?,?,?,?,?,?,?,?,?,?)`,
            [
                idCotizacion,
                s.ID_Servicio,
                s.fecha_inicio || null,
                s.fecha_finalizacion || null,
                s.jornada_comienzo || null,
                s.jornada_final || null,
                s.precio_comercial ?? null,
                'NO',
                s.indicaciones ?? null,
                s.id_servicio_subservicio ?? null,
            ],
        );
        inserted.push({ id: ins.insertId, ID_Servicio: s.ID_Servicio });
    }
    return inserted;
}

async function listDestinatariosCotizacion(idIncidencia) {
    const incRows = await db.query(
        `SELECT INC.*, C.nombre_comercial AS Empresa_Nombre, C.razon_social AS Empresa_Razon
         FROM INCIDENCIA INC
         LEFT JOIN CLIENTE C ON INC.empresa_involucrada = C.DNI_O_RUC
         WHERE INC.id_incidencia = ?`,
        [idIncidencia],
    );
    if (!incRows.length) throw httpError(404, 'Incidencia no encontrada');
    const incidencia = incRows[0];

    const involucrados = await db.query(
        `SELECT I.id, I.dni_involucrado, I.nombre, I.Perfil_Registrado,
                P.Nombre AS Involucrado_Nombre, P.Apellido AS Involucrado_Apellido
         FROM INVOLUCRADO I
         LEFT JOIN PERFIL P ON I.dni_involucrado = P.DNI
         WHERE I.id_incidencia = ?
         ORDER BY I.id ASC`,
        [idIncidencia],
    );

    const opciones = involucrados.map((inv) => {
        const label = inv.dni_involucrado
            ? `${inv.Involucrado_Nombre || ''} ${inv.Involucrado_Apellido || ''}`.trim()
            : (inv.nombre || `Involucrado #${inv.id}`);
        return {
            tipo: 'involucrado',
            involucrado_id: inv.id,
            label,
            dni: inv.dni_involucrado || null,
            tiene_perfil: Boolean(inv.dni_involucrado),
        };
    });

    if (incidencia.empresa_involucrada) {
        opciones.push({
            tipo: 'empresa',
            dni_o_ruc: incidencia.empresa_involucrada,
            label: incidencia.Empresa_Nombre || incidencia.Empresa_Razon || incidencia.empresa_involucrada,
        });
    }

    opciones.push({
        tipo: 'no_especificado',
        dni_o_ruc: DUMMY_CLIENT_DNI,
        label: 'Cliente no especificado',
    });

    return { incidencia, opciones };
}

async function listCotizacionesByIncidencia(idIncidencia) {
    const rows = await db.query(
        `SELECT C_C.*, C.nombre_comercial AS Cliente_Nombre
         FROM COTIZACION_COMERCIAL C_C
         LEFT JOIN CLIENTE C ON C_C.DNI_O_RUC = C.DNI_O_RUC
         WHERE C_C.Id_incidencia = ?
         ORDER BY C_C.version DESC, C_C.ID DESC`,
        [idIncidencia],
    );
    return rows;
}

async function createCotizacionIncidencia(idIncidencia, body) {
    return withTx(db, async (exec) => {
        const incRows = await exec.query(
            'SELECT id_incidencia, nombre_incidencia FROM INCIDENCIA WHERE id_incidencia = ?',
            [idIncidencia],
        );
        if (!incRows.length) throw httpError(404, 'Incidencia no encontrada');

        const destinatario = body.destinatario || {
            tipo: body.destinatario_tipo,
            involucrado_id: body.involucrado_id,
        };
        const cliente = await resolveDestinatarioCliente(exec, idIncidencia, destinatario);

        const serviciosList = body.servicios || [];
        await assertServiciosPermitidosIncidencia(exec, serviciosList);

        const diferencias = await getPresupuestoDiferenciasIncidencia(exec, idIncidencia);
        const montoDiferencias = diferencias.reduce((sum, d) => sum + Math.abs(d.diferencia), 0);
        const montoServicios = serviciosList.reduce((sum, raw) => {
            const s = normalizeServiceItem(raw);
            return sum + (Number(s.precio_comercial) || 0);
        }, 0);
        const precioTotal = montoDiferencias + montoServicios;

        const countRows = await exec.query(
            'SELECT COUNT(*) AS total FROM COTIZACION_COMERCIAL WHERE Id_incidencia = ?',
            [idIncidencia],
        );
        const versionNum = (countRows[0]?.total || 0) + 1;
        const nombreInc = incRows[0].nombre_incidencia || `Incidencia ${idIncidencia}`;
        const nombre = body.nombre || `Cotización incidencia - ${nombreInc} (v${versionNum})`;

        const hoy = new Date().toISOString().slice(0, 10);
        let observacion = body.observacion || null;
        if (cliente.observacionExtra) {
            observacion = observacion
                ? `${observacion}\n${cliente.observacionExtra}`
                : cliente.observacionExtra;
        }

        const result = await exec.query(
            `INSERT INTO COTIZACION_COMERCIAL
                (version, desactualizado, nombre, id_solicitud, DNI_O_RUC, precio_total, estado,
                 comentario_cliente, fecha_emision, fecha_vigencia, observacion,
                 Tasa_Cambio, condiciones, tacaCompra, tasaVenta,
                 etapas, duracion_etapa, etapas_detalle, direccion_recojo, Id_incidencia)
             VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
            [
                versionNum,
                DESACTUALIZADO_VIGENTE,
                nombre,
                null,
                cliente.DNI_O_RUC,
                precioTotal,
                'Pendiente',
                body.comentario_cliente || null,
                body.fecha_emision || hoy,
                body.fecha_vigencia || null,
                observacion,
                body.Tasa_Cambio || null,
                body.condiciones || null,
                body.tasaCompra || body.tacaCompra || null,
                body.tasaVenta || null,
                null,
                null,
                null,
                null,
                idIncidencia,
            ],
        );

        const newId = result.insertId;
        const presupuestoInsertado = await insertPresupuestoDiferencias(exec, newId, idIncidencia, diferencias);
        const serviciosInsertados = await insertServiciosIncidencia(exec, newId, serviciosList);

        return {
            id: newId,
            version: versionNum,
            nombre,
            DNI_O_RUC: cliente.DNI_O_RUC,
            destinatario: {
                tipo: cliente.destinatarioTipo,
                label: cliente.destinatarioLabel,
                involucrado_id: cliente.involucrado_id ?? null,
            },
            precio_total: precioTotal,
            presupuesto_autorrellenado: presupuestoInsertado,
            servicios: serviciosInsertados,
            Id_incidencia: idIncidencia,
            id_solicitud: null,
        };
    });
}

async function getServiciosCatalogoIncidencia() {
    return db.query(
        `SELECT ID_Servicio, nombre, descripcion, condicional_precio, observaciones, Estado,
                servicio_de_incidencia, foto
         FROM SERVICIO
         WHERE Estado = 'Activo'
           AND (servicio_de_incidencia = 'YES' OR ID_Servicio = ?)
         ORDER BY nombre ASC`,
        [ENVIO_SERVICIO_ID],
    );
}

async function isCotizacionIncidencia(exec, cotizacionId) {
    const rows = await exec.query(
        'SELECT Id_incidencia FROM COTIZACION_COMERCIAL WHERE ID = ?',
        [cotizacionId],
    );
    return rows.length > 0 && rows[0].Id_incidencia != null;
}

module.exports = {
    DUMMY_CLIENT_DNI,
    ENVIO_SERVICIO_ID,
    isServicioPermitidoIncidencia,
    assertServiciosPermitidosIncidencia,
    listDestinatariosCotizacion,
    listCotizacionesByIncidencia,
    createCotizacionIncidencia,
    getServiciosCatalogoIncidencia,
    isCotizacionIncidencia,
    getPresupuestoDiferenciasIncidencia,
};
