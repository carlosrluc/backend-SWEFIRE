const { parsePhasesFromRow } = require('./cotizacionDto.service');

function etapaReferencia(item, index) {
    const raw = item?.id ?? item?.referencia;
    if (raw !== undefined && raw !== null && String(raw).trim() !== '') {
        return String(raw).trim();
    }
    return `etapa-${index + 1}`;
}

function actividadReferencia(act, etapaIndex, actIndex) {
    const raw = act?.id ?? act?.referencia;
    if (raw !== undefined && raw !== null && String(raw).trim() !== '') {
        return String(raw).trim();
    }
    return `act-${etapaIndex + 1}-${actIndex + 1}`;
}

function publicIdFromRow(row, fallbackIndex) {
    if (row.referencia) return row.referencia;
    if (row.id != null) return String(row.id);
    return `item-${fallbackIndex + 1}`;
}

function buildPhasesPayloadFromTree(etapasTree) {
    return {
        items: etapasTree.map((etapa, ei) => ({
            id: publicIdFromRow(etapa, ei),
            id_bd: etapa.id,
            name: etapa.nombre,
            description: etapa.descripcion ?? '',
            duration: Number(etapa.duracion) || 0,
            activities: (etapa.actividades || []).map((act, ai) => ({
                id: publicIdFromRow(act, ai),
                id_bd: act.id,
                name: act.nombre,
            })),
        })),
    };
}

function summarizePhases(etapasTree) {
    if (!etapasTree.length) {
        return { etapas: null, duracion_etapa: null, etapas_detalle: null };
    }
    const totalDuration = etapasTree.reduce((sum, e) => sum + (Number(e.duracion) || 0), 0);
    const phasesPayload = buildPhasesPayloadFromTree(etapasTree);
    return {
        etapas: etapasTree.length,
        duracion_etapa: String(totalDuration),
        etapas_detalle: JSON.stringify(phasesPayload),
    };
}

async function loadCotizacionEtapasTree(executor, idCotizacion) {
    const etapas = await executor.query(
        `SELECT id, ID_Cotizacion, referencia, nombre, descripcion, duracion, orden
         FROM COTIZACION_ETAPA
         WHERE ID_Cotizacion = ?
         ORDER BY orden ASC, id ASC`,
        [idCotizacion],
    );
    if (!etapas.length) return [];

    const actividades = await executor.query(
        `SELECT id, id_cotizacion_etapa, ID_Cotizacion, referencia, nombre, orden
         FROM COTIZACION_ACTIVIDAD
         WHERE ID_Cotizacion = ?
         ORDER BY orden ASC, id ASC`,
        [idCotizacion],
    );
    const actsByEtapa = new Map();
    for (const act of actividades) {
        if (!actsByEtapa.has(act.id_cotizacion_etapa)) actsByEtapa.set(act.id_cotizacion_etapa, []);
        actsByEtapa.get(act.id_cotizacion_etapa).push(act);
    }
    return etapas.map((e) => ({
        ...e,
        actividades: actsByEtapa.get(e.id) || [],
    }));
}

function indexExistingEtapas(rows) {
    const byReferencia = new Map();
    const byId = new Map();
    for (const row of rows) {
        byId.set(row.id, row);
        if (row.referencia) byReferencia.set(row.referencia, row);
    }
    return { byReferencia, byId };
}

function indexExistingActividades(rows) {
    const byReferencia = new Map();
    const byId = new Map();
    for (const row of rows) {
        byId.set(row.id, row);
        if (row.referencia) byReferencia.set(row.referencia, row);
    }
    return { byReferencia, byId };
}

function resolveEtapaExistente(indexes, item, index) {
    const ref = etapaReferencia(item, index);
    if (indexes.byReferencia.has(ref)) {
        return { row: indexes.byReferencia.get(ref), referencia: ref };
    }
    const numId = Number(item.id);
    if (Number.isInteger(numId) && numId > 0 && indexes.byId.has(numId)) {
        return { row: indexes.byId.get(numId), referencia: ref };
    }
    return { row: null, referencia: ref };
}

function resolveActividadExistente(indexes, act, etapaIndex, actIndex) {
    const ref = actividadReferencia(act, etapaIndex, actIndex);
    if (indexes.byReferencia.has(ref)) {
        return { row: indexes.byReferencia.get(ref), referencia: ref };
    }
    const numId = Number(act.id);
    if (Number.isInteger(numId) && numId > 0 && indexes.byId.has(numId)) {
        return { row: indexes.byId.get(numId), referencia: ref };
    }
    return { row: null, referencia: ref };
}

async function deleteByIds(executor, table, idColumn, ids) {
    if (!ids.length) return;
    const placeholders = ids.map(() => '?').join(',');
    await executor.query(
        `DELETE FROM ${table} WHERE ${idColumn} IN (${placeholders})`,
        ids,
    );
}

/**
 * Sincroniza etapas/actividades desde phases.
 * - Orden de etapas = posición en items[] (campo orden).
 * - Orden de actividades = posición en activities[] dentro de cada etapa.
 * - referencia = id del front (fase-1, act-2); permite reordenar y mover actividades de etapa.
 */
async function syncCotizacionEtapasFromPhases(executor, idCotizacion, phasesPayload) {
    const items = phasesPayload?.items ?? (Array.isArray(phasesPayload) ? phasesPayload : []);

    if (!items.length) {
        await executor.query('DELETE FROM COTIZACION_ACTIVIDAD WHERE ID_Cotizacion = ?', [idCotizacion]);
        await executor.query('DELETE FROM COTIZACION_ETAPA WHERE ID_Cotizacion = ?', [idCotizacion]);
        await executor.query(
            'UPDATE COTIZACION_COMERCIAL SET etapas = NULL, duracion_etapa = NULL, etapas_detalle = NULL WHERE ID = ?',
            [idCotizacion],
        );
        return { synced: true, etapas: 0 };
    }

    const etapasExistentes = await executor.query(
        'SELECT id, referencia FROM COTIZACION_ETAPA WHERE ID_Cotizacion = ?',
        [idCotizacion],
    );
    const actividadesExistentes = await executor.query(
        'SELECT id, referencia, id_cotizacion_etapa FROM COTIZACION_ACTIVIDAD WHERE ID_Cotizacion = ?',
        [idCotizacion],
    );
    const idxEtapas = indexExistingEtapas(etapasExistentes);
    const idxActs = indexExistingActividades(actividadesExistentes);

    const keptEtapaIds = new Set();
    const keptActIds = new Set();

    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const { row: etapaRow, referencia: etapaRef } = resolveEtapaExistente(idxEtapas, item, i);
        const ordenEtapa = i + 1;
        const nombre = item.name ?? item.nombre ?? '';
        const descripcion = item.description ?? item.descripcion ?? null;
        const duracion = Number(item.duration ?? item.duracion ?? 0);

        let idEtapa;
        if (etapaRow) {
            idEtapa = etapaRow.id;
            await executor.query(
                `UPDATE COTIZACION_ETAPA
                 SET referencia = ?, nombre = ?, descripcion = ?, duracion = ?, orden = ?
                 WHERE id = ?`,
                [etapaRef, nombre, descripcion, duracion, ordenEtapa, idEtapa],
            );
        } else {
            const etapaResult = await executor.query(
                `INSERT INTO COTIZACION_ETAPA
                    (ID_Cotizacion, referencia, nombre, descripcion, duracion, orden)
                 VALUES (?,?,?,?,?,?)`,
                [idCotizacion, etapaRef, nombre, descripcion, duracion, ordenEtapa],
            );
            idEtapa = etapaResult.insertId;
        }
        keptEtapaIds.add(idEtapa);
        idxEtapas.byReferencia.set(etapaRef, { id: idEtapa, referencia: etapaRef });
        idxEtapas.byId.set(idEtapa, { id: idEtapa, referencia: etapaRef });

        const activities = item.activities ?? item.actividades ?? [];
        for (let j = 0; j < activities.length; j++) {
            const act = activities[j];
            const { row: actRow, referencia: actRef } = resolveActividadExistente(idxActs, act, i, j);
            const ordenAct = j + 1;
            const nombreAct = act.name ?? act.nombre ?? '';

            if (actRow) {
                await executor.query(
                    `UPDATE COTIZACION_ACTIVIDAD
                     SET referencia = ?, id_cotizacion_etapa = ?, nombre = ?, orden = ?
                     WHERE id = ?`,
                    [actRef, idEtapa, nombreAct, ordenAct, actRow.id],
                );
                keptActIds.add(actRow.id);
                idxActs.byReferencia.set(actRef, { id: actRow.id, referencia: actRef });
            } else {
                const actResult = await executor.query(
                    `INSERT INTO COTIZACION_ACTIVIDAD
                        (id_cotizacion_etapa, ID_Cotizacion, referencia, nombre, orden)
                     VALUES (?,?,?,?,?)`,
                    [idEtapa, idCotizacion, actRef, nombreAct, ordenAct],
                );
                keptActIds.add(actResult.insertId);
                idxActs.byReferencia.set(actRef, { id: actResult.insertId, referencia: actRef });
            }
        }
    }

    const removeActIds = actividadesExistentes
        .map((a) => a.id)
        .filter((id) => !keptActIds.has(id));
    const removeEtapaIds = etapasExistentes
        .map((e) => e.id)
        .filter((id) => !keptEtapaIds.has(id));

    await deleteByIds(executor, 'COTIZACION_ACTIVIDAD', 'id', removeActIds);
    await deleteByIds(executor, 'COTIZACION_ETAPA', 'id', removeEtapaIds);

    const tree = await loadCotizacionEtapasTree(executor, idCotizacion);
    const summary = summarizePhases(tree);
    await executor.query(
        'UPDATE COTIZACION_COMERCIAL SET etapas = ?, duracion_etapa = ?, etapas_detalle = ? WHERE ID = ?',
        [summary.etapas, summary.duracion_etapa, summary.etapas_detalle, idCotizacion],
    );
    return { synced: true, etapas: tree.length };
}

async function ensureCotizacionEtapasFromJson(executor, idCotizacion) {
    const existing = await executor.query(
        'SELECT id FROM COTIZACION_ETAPA WHERE ID_Cotizacion = ? LIMIT 1',
        [idCotizacion],
    );
    if (existing.length) return { synced: false, reason: 'already_exists' };

    const rows = await executor.query(
        'SELECT etapas_detalle FROM COTIZACION_COMERCIAL WHERE ID = ?',
        [idCotizacion],
    );
    if (!rows.length || !rows[0].etapas_detalle) return { synced: false, reason: 'no_json' };

    const phases = parsePhasesFromRow(rows[0]);
    if (!phases.items.length) return { synced: false, reason: 'empty_phases' };
    return syncCotizacionEtapasFromPhases(executor, idCotizacion, phases);
}

module.exports = {
    etapaReferencia,
    actividadReferencia,
    buildPhasesPayloadFromTree,
    loadCotizacionEtapasTree,
    syncCotizacionEtapasFromPhases,
    ensureCotizacionEtapasFromJson,
    summarizePhases,
};
