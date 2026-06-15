const {
    syncActividadFromSubservicio,
    getNextActividadOrden,
} = require('./servicioFlujo.service');

function resolveEtapaId(sub, etapasByOrden) {
    if (sub.id_servicio_etapa != null) return Number(sub.id_servicio_etapa);
    const orden = sub.orden_etapa ?? sub.ubicacion_etapa?.orden;
    if (orden != null && etapasByOrden.has(Number(orden))) {
        return etapasByOrden.get(Number(orden));
    }
    return null;
}

async function deleteIdsNotIn(executor, table, idColumn, whereSql, whereParams, keepIds) {
    const safeIds = (keepIds || []).filter((id) => Number.isInteger(Number(id)) && Number(id) > 0);
    if (safeIds.length) {
        const placeholders = safeIds.map(() => '?').join(',');
        const result = await executor.query(
            `DELETE FROM ${table} WHERE ${whereSql} AND ${idColumn} NOT IN (${placeholders})`,
            [...whereParams, ...safeIds.map(Number)],
        );
        return result.affectedRows ?? 0;
    }
    const result = await executor.query(
        `DELETE FROM ${table} WHERE ${whereSql}`,
        whereParams,
    );
    return result.affectedRows ?? 0;
}

async function insertActividadesManuales(executor, idServicio, idEtapa, actividades = []) {
    for (const act of actividades) {
        if (!act?.nombre) continue;
        const orden = act.orden ?? await getNextActividadOrden(executor, idEtapa);
        await executor.query(
            `INSERT INTO SERVICIO_ACTIVIDAD (id_servicio_etapa, ID_Servicio, nombre, orden, origen)
             VALUES (?,?,?,?, 'manual')`,
            [idEtapa, idServicio, act.nombre, orden],
        );
    }
}

async function pruneManualActividades(executor, idServicio, idEtapa, actividades = []) {
    const keepIds = actividades
        .filter((a) => a?.id != null)
        .map((a) => Number(a.id));
    return deleteIdsNotIn(
        executor,
        'SERVICIO_ACTIVIDAD',
        'id',
        'id_servicio_etapa = ? AND ID_Servicio = ? AND origen = ?',
        [idEtapa, idServicio, 'manual'],
        keepIds,
    );
}

async function upsertActividadesManuales(executor, idServicio, idEtapa, actividades = []) {
    for (const act of actividades) {
        if (!act) continue;
        if (act.id) {
            const actual = await executor.query(
                `SELECT origen FROM SERVICIO_ACTIVIDAD WHERE id=? AND id_servicio_etapa=? AND ID_Servicio=?`,
                [act.id, idEtapa, idServicio],
            );
            if (!actual.length) continue;
            if (actual[0].origen === 'subservicio') continue;
            await executor.query(
                `UPDATE SERVICIO_ACTIVIDAD SET nombre=COALESCE(?, nombre), orden=COALESCE(?, orden)
                 WHERE id=? AND id_servicio_etapa=? AND ID_Servicio=? AND origen='manual'`,
                [act.nombre ?? null, act.orden ?? null, act.id, idEtapa, idServicio],
            );
        } else if (act.nombre) {
            const orden = act.orden ?? await getNextActividadOrden(executor, idEtapa);
            await executor.query(
                `INSERT INTO SERVICIO_ACTIVIDAD (id_servicio_etapa, ID_Servicio, nombre, orden, origen)
                 VALUES (?,?,?,?, 'manual')`,
                [idEtapa, idServicio, act.nombre, orden],
            );
        }
    }
}

async function crearEtapasConActividades(executor, idServicio, etapas = []) {
    const etapasByOrden = new Map();
    for (let i = 0; i < etapas.length; i++) {
        const etapa = etapas[i];
        if (!etapa?.nombre) continue;
        const orden = etapa.orden ?? i + 1;
        const ins = await executor.query(
            `INSERT INTO SERVICIO_ETAPA (ID_Servicio, nombre, descripcion, duracion, orden)
             VALUES (?,?,?,?,?)`,
            [idServicio, etapa.nombre, etapa.descripcion ?? null, etapa.duracion ?? 0, orden],
        );
        etapasByOrden.set(orden, ins.insertId);
        await insertActividadesManuales(executor, idServicio, ins.insertId, etapa.actividades);
    }
    return etapasByOrden;
}

async function crearSubservicios(executor, idServicio, subservicios = [], etapasByOrden) {
    const created = [];
    for (const sub of subservicios) {
        if (!sub?.ID_Servicio_subservicio) continue;
        if (Number(sub.ID_Servicio_subservicio) === Number(idServicio)) {
            const err = new Error('Un servicio no puede ser subservicio de sí mismo');
            err.statusCode = 400;
            throw err;
        }
        const idEtapa = resolveEtapaId(sub, etapasByOrden);
        if (!idEtapa) {
            const err = new Error('Cada subservicio requiere id_servicio_etapa u orden_etapa de una etapa del servicio');
            err.statusCode = 400;
            throw err;
        }
        const [subSvc, etapa] = await Promise.all([
            executor.query('SELECT ID_Servicio FROM SERVICIO WHERE ID_Servicio = ?', [sub.ID_Servicio_subservicio]),
            executor.query('SELECT id FROM SERVICIO_ETAPA WHERE id = ? AND ID_Servicio = ?', [idEtapa, idServicio]),
        ]);
        if (!subSvc.length) {
            const err = new Error(`Servicio subservicio ${sub.ID_Servicio_subservicio} no encontrado`);
            err.statusCode = 404;
            throw err;
        }
        if (!etapa.length) {
            const err = new Error(`Etapa ${idEtapa} no pertenece al servicio ${idServicio}`);
            err.statusCode = 400;
            throw err;
        }
        const ins = await executor.query(
            `INSERT INTO SERVICIO_SUBSERVICIO (ID_Servicio, ID_Servicio_subservicio, id_servicio_etapa)
             VALUES (?,?,?)`,
            [idServicio, sub.ID_Servicio_subservicio, idEtapa],
        );
        await syncActividadFromSubservicio(executor, ins.insertId);
        created.push({ id: ins.insertId, ID_Servicio_subservicio: sub.ID_Servicio_subservicio });
    }
    return created;
}

async function loadEtapasByOrden(executor, idServicio) {
    const rows = await executor.query(
        'SELECT id, orden FROM SERVICIO_ETAPA WHERE ID_Servicio = ?',
        [idServicio],
    );
    const map = new Map();
    for (const row of rows) map.set(row.orden, row.id);
    return map;
}

async function upsertEtapa(executor, idServicio, etapa, index) {
    if (etapa.id) {
        await executor.query(
            `UPDATE SERVICIO_ETAPA
             SET nombre=COALESCE(?, nombre), descripcion=COALESCE(?, descripcion),
                 duracion=COALESCE(?, duracion), orden=COALESCE(?, orden)
             WHERE id=? AND ID_Servicio=?`,
            [
                etapa.nombre ?? null,
                etapa.descripcion ?? null,
                etapa.duracion ?? null,
                etapa.orden ?? null,
                etapa.id,
                idServicio,
            ],
        );
        return Number(etapa.id);
    }
    if (!etapa.nombre) return null;
    const orden = etapa.orden ?? index + 1;
    const ins = await executor.query(
        `INSERT INTO SERVICIO_ETAPA (ID_Servicio, nombre, descripcion, duracion, orden)
         VALUES (?,?,?,?,?)`,
        [idServicio, etapa.nombre, etapa.descripcion ?? null, etapa.duracion ?? 0, orden],
    );
    return ins.insertId;
}

async function syncEtapasOnUpdate(executor, idServicio, etapas = []) {
    const keptEtapaIds = etapas
        .filter((e) => e?.id != null)
        .map((e) => Number(e.id));
    const etapasEliminadas = await deleteIdsNotIn(
        executor,
        'SERVICIO_ETAPA',
        'id',
        'ID_Servicio = ?',
        [idServicio],
        keptEtapaIds,
    );

    let actividadesEliminadas = 0;
    const etapasByOrden = new Map();

    for (let i = 0; i < etapas.length; i++) {
        const etapa = etapas[i];
        if (!etapa) continue;
        const idEtapa = await upsertEtapa(executor, idServicio, etapa, i);
        if (!idEtapa) continue;

        const orden = etapa.orden ?? i + 1;
        etapasByOrden.set(orden, idEtapa);

        if (Array.isArray(etapa.actividades)) {
            actividadesEliminadas += await pruneManualActividades(
                executor, idServicio, idEtapa, etapa.actividades,
            );
            await upsertActividadesManuales(executor, idServicio, idEtapa, etapa.actividades);
        }
    }

    return { etapasByOrden, etapasEliminadas, actividadesEliminadas };
}

async function syncSubserviciosOnUpdate(executor, idServicio, subservicios = [], etapasByOrden) {
    const keptSubIds = subservicios
        .filter((s) => s?.id != null)
        .map((s) => Number(s.id));
    const subserviciosEliminados = await deleteIdsNotIn(
        executor,
        'SERVICIO_SUBSERVICIO',
        'id',
        'ID_Servicio = ?',
        [idServicio],
        keptSubIds,
    );

    const result = [];
    for (const sub of subservicios) {
        if (!sub) continue;
        if (sub.id) {
            if (sub.ID_Servicio_subservicio && Number(sub.ID_Servicio_subservicio) === Number(idServicio)) {
                const err = new Error('Un servicio no puede ser subservicio de sí mismo');
                err.statusCode = 400;
                throw err;
            }

            const actualRows = await executor.query(
                'SELECT * FROM SERVICIO_SUBSERVICIO WHERE id=? AND ID_Servicio=?',
                [sub.id, idServicio],
            );
            if (!actualRows.length) continue;
            const prev = actualRows[0];

            const idEtapa = sub.id_servicio_etapa != null
                ? Number(sub.id_servicio_etapa)
                : resolveEtapaId(sub, etapasByOrden);

            if (idEtapa) {
                const etapa = await executor.query(
                    'SELECT id FROM SERVICIO_ETAPA WHERE id = ? AND ID_Servicio = ?',
                    [idEtapa, idServicio],
                );
                if (!etapa.length) {
                    const err = new Error(`Etapa ${idEtapa} no pertenece al servicio ${idServicio}`);
                    err.statusCode = 400;
                    throw err;
                }
            }

            const newSubServicio = sub.ID_Servicio_subservicio != null
                ? Number(sub.ID_Servicio_subservicio)
                : Number(prev.ID_Servicio_subservicio);
            const newEtapa = idEtapa ?? Number(prev.id_servicio_etapa);
            const changed = newSubServicio !== Number(prev.ID_Servicio_subservicio)
                || newEtapa !== Number(prev.id_servicio_etapa);

            await executor.query(
                `UPDATE SERVICIO_SUBSERVICIO
                 SET ID_Servicio_subservicio=COALESCE(?, ID_Servicio_subservicio),
                     id_servicio_etapa=COALESCE(?, id_servicio_etapa)
                 WHERE id=? AND ID_Servicio=?`,
                [
                    sub.ID_Servicio_subservicio ?? null,
                    idEtapa ?? null,
                    sub.id,
                    idServicio,
                ],
            );

            if (changed) {
                await syncActividadFromSubservicio(executor, sub.id);
            }
            result.push({ id: sub.id, updated: true, actividad_sincronizada: changed });
        } else {
            const created = await crearSubservicios(executor, idServicio, [sub], etapasByOrden);
            result.push(...created.map((c) => ({ ...c, created: true })));
        }
    }

    return { result, subserviciosEliminados };
}

async function persistFlujoOnServicioCreate(executor, idServicio, body = {}) {
    const etapas = Array.isArray(body.etapas) ? body.etapas : [];
    const subservicios = Array.isArray(body.subservicios) ? body.subservicios : [];
    const etapasByOrden = await crearEtapasConActividades(executor, idServicio, etapas);
    const subsCreados = await crearSubservicios(executor, idServicio, subservicios, etapasByOrden);
    return { etapas: etapasByOrden.size, subservicios: subsCreados.length };
}

/**
 * Sincroniza el flujo en PUT: lo que no viene en el payload se elimina;
 * lo que viene con id se actualiza; sin id se crea.
 */
async function mergeFlujoOnServicioUpdate(executor, idServicio, body = {}) {
    const out = {
        etapas_procesadas: 0,
        subservicios_procesados: 0,
        etapas_eliminadas: 0,
        actividades_eliminadas: 0,
        subservicios_eliminados: 0,
    };

    let etapasByOrden = await loadEtapasByOrden(executor, idServicio);

    if (Array.isArray(body.etapas)) {
        const syncEtapas = await syncEtapasOnUpdate(executor, idServicio, body.etapas);
        etapasByOrden = syncEtapas.etapasByOrden;
        out.etapas_procesadas = body.etapas.length;
        out.etapas_eliminadas = syncEtapas.etapasEliminadas;
        out.actividades_eliminadas = syncEtapas.actividadesEliminadas;
    }

    if (Array.isArray(body.subservicios)) {
        const syncSubs = await syncSubserviciosOnUpdate(
            executor, idServicio, body.subservicios, etapasByOrden,
        );
        out.subservicios_procesados = syncSubs.result.length;
        out.subservicios_eliminados = syncSubs.subserviciosEliminados;
    }

    return out;
}

module.exports = {
    persistFlujoOnServicioCreate,
    mergeFlujoOnServicioUpdate,
};
