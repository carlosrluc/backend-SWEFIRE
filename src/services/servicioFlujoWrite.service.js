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

async function insertActividadesManuales(executor, idServicio, idEtapa, actividades = []) {
    for (let j = 0; j < actividades.length; j++) {
        const act = actividades[j];
        if (!act?.nombre) continue;
        const orden = act.orden ?? await getNextActividadOrden(executor, idEtapa);
        await executor.query(
            `INSERT INTO SERVICIO_ACTIVIDAD (id_servicio_etapa, ID_Servicio, nombre, orden, origen)
             VALUES (?,?,?,?, 'manual')`,
            [idEtapa, idServicio, act.nombre, orden],
        );
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
                 WHERE id=? AND id_servicio_etapa=? AND ID_Servicio=?`,
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

async function upsertEtapasYActividades(executor, idServicio, etapas = []) {
    const etapasByOrden = await loadEtapasByOrden(executor, idServicio);
    for (let i = 0; i < etapas.length; i++) {
        const etapa = etapas[i];
        if (!etapa) continue;
        let idEtapa;
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
            idEtapa = etapa.id;
            if (etapa.orden != null) etapasByOrden.set(etapa.orden, idEtapa);
        } else if (etapa.nombre) {
            const orden = etapa.orden ?? i + 1;
            const ins = await executor.query(
                `INSERT INTO SERVICIO_ETAPA (ID_Servicio, nombre, descripcion, duracion, orden)
                 VALUES (?,?,?,?,?)`,
                [idServicio, etapa.nombre, etapa.descripcion ?? null, etapa.duracion ?? 0, orden],
            );
            idEtapa = ins.insertId;
            etapasByOrden.set(orden, idEtapa);
        } else {
            continue;
        }
        if (Array.isArray(etapa.actividades)) {
            await upsertActividadesManuales(executor, idServicio, idEtapa, etapa.actividades);
        }
    }
    return etapasByOrden;
}

async function upsertSubservicios(executor, idServicio, subservicios = [], etapasByOrden) {
    const result = [];
    for (const sub of subservicios) {
        if (!sub) continue;
        if (sub.id) {
            if (sub.ID_Servicio_subservicio && Number(sub.ID_Servicio_subservicio) === Number(idServicio)) {
                const err = new Error('Un servicio no puede ser subservicio de sí mismo');
                err.statusCode = 400;
                throw err;
            }
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
            await syncActividadFromSubservicio(executor, sub.id);
            result.push({ id: sub.id, updated: true });
        } else {
            const created = await crearSubservicios(executor, idServicio, [sub], etapasByOrden);
            result.push(...created);
        }
    }
    return result;
}

async function persistFlujoOnServicioCreate(executor, idServicio, body = {}) {
    const etapas = Array.isArray(body.etapas) ? body.etapas : [];
    const subservicios = Array.isArray(body.subservicios) ? body.subservicios : [];
    const etapasByOrden = await crearEtapasConActividades(executor, idServicio, etapas);
    const subsCreados = await crearSubservicios(executor, idServicio, subservicios, etapasByOrden);
    return { etapas: etapasByOrden.size, subservicios: subsCreados.length };
}

async function mergeFlujoOnServicioUpdate(executor, idServicio, body = {}) {
    const out = { etapas: 0, subservicios: 0 };
    let etapasByOrden = await loadEtapasByOrden(executor, idServicio);
    if (Array.isArray(body.etapas)) {
        etapasByOrden = await upsertEtapasYActividades(executor, idServicio, body.etapas);
        out.etapas = body.etapas.length;
    }
    if (Array.isArray(body.subservicios)) {
        const subs = await upsertSubservicios(executor, idServicio, body.subservicios, etapasByOrden);
        out.subservicios = subs.length;
    }
    return out;
}

module.exports = {
    persistFlujoOnServicioCreate,
    mergeFlujoOnServicioUpdate,
};
