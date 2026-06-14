const { loadCotizacionEtapasTree, ensureCotizacionEtapasFromJson } = require('./cotizacionEtapas.service');
const { principalToBoolean } = require('./servicioFlujo.service');

const ESTADOS_ETAPA = new Set(['no comenzado', 'en progreso', 'completada']);
const TIPO_PENDIENTE = 'pendiente';
const TIPO_COTIZACION = 'cotizacion';
const TIPO_TERMINADO = 'terminado';
const NOMBRE_ETAPA_PENDIENTE = 'En pendientes';
const NOMBRE_ETAPA_TERMINADO = 'Terminado';

const ETAPA_SELECT = `id, id_Proyecto, tipo, id_cotizacion_etapa, codigo, nombre, descripcion,
    duracion, orden, estado, fecha_inicio, fecha_fin`;
const ACTIVIDAD_SELECT = `id, id_proyecto_etapa, id_Proyecto, id_cotizacion_actividad, codigo,
    nombre, orden, estado, fecha_inicio, fecha_fin`;

async function syncProyectoEtapasFromCotizacion(executor, idProyecto, idCotizacion) {
    const existing = await executor.query(
        'SELECT id FROM PROYECTO_ETAPA WHERE id_Proyecto = ? LIMIT 1',
        [idProyecto],
    );
    if (existing.length) return { synced: false, reason: 'already_exists' };

    await ensureCotizacionEtapasFromJson(executor, idCotizacion);
    const fases = await loadCotizacionEtapasTree(executor, idCotizacion);
    if (!fases.length) return { synced: false, reason: 'no_phases' };

    const pendienteResult = await executor.query(
        `INSERT INTO PROYECTO_ETAPA
            (id_Proyecto, tipo, nombre, descripcion, duracion, orden, estado)
         VALUES (?, ?, ?, NULL, 0, 0, 'en progreso')`,
        [idProyecto, TIPO_PENDIENTE, NOMBRE_ETAPA_PENDIENTE],
    );
    const idEtapaPendiente = pendienteResult.insertId;

    for (const fase of fases) {
        const etapaResult = await executor.query(
            `INSERT INTO PROYECTO_ETAPA
                (id_Proyecto, tipo, id_cotizacion_etapa, codigo, nombre, descripcion, duracion, orden, estado)
             VALUES (?,?,?,?,?,?,?,?,'no comenzado')`,
            [
                idProyecto,
                TIPO_COTIZACION,
                fase.id,
                fase.referencia ?? null,
                fase.nombre,
                fase.descripcion,
                fase.duracion,
                fase.orden,
            ],
        );
        const idEtapa = etapaResult.insertId;
        for (const act of fase.actividades) {
            await executor.query(
                `INSERT INTO PROYECTO_ACTIVIDAD
                    (id_proyecto_etapa, id_Proyecto, id_cotizacion_actividad, codigo, nombre, orden, estado)
                 VALUES (?,?,?,?,?,?,'no comenzado')`,
                [idEtapa, idProyecto, act.id, act.referencia ?? null, act.nombre, act.orden],
            );
        }
    }

    await executor.query(
        `UPDATE PROYECTO SET etapa_actual_id = ?, actividad_actual_id = NULL WHERE id_Proyecto = ?`,
        [idEtapaPendiente, idProyecto],
    );

    return { synced: true, fases: fases.length, id_etapa_pendiente: idEtapaPendiente };
}

async function ensureProyectoEtapas(executor, idProyecto, idCotizacion) {
    if (!idCotizacion) return;
    await syncProyectoEtapasFromCotizacion(executor, idProyecto, idCotizacion);
}

async function getPrimeraEtapaCotizacion(executor, idProyecto) {
    const rows = await executor.query(
        `SELECT id FROM PROYECTO_ETAPA
         WHERE id_Proyecto = ? AND tipo = ? AND estado = 'no comenzado'
         ORDER BY orden ASC, id ASC
         LIMIT 1`,
        [idProyecto, TIPO_COTIZACION],
    );
    return rows[0]?.id ?? null;
}

async function autoStartProyectoEtapas(executor) {
    const candidatos = await executor.query(`
        SELECT P.id_Proyecto
        FROM PROYECTO P
        WHERE P.estado IN ('Pendiente', 'No iniciado')
          AND P.fecha_inicio IS NOT NULL
          AND (
            P.fecha_inicio < CURDATE()
            OR (
              P.fecha_inicio = CURDATE()
              AND (P.hora_inicio IS NULL OR CURTIME() >= P.hora_inicio)
            )
          )
          AND EXISTS (
            SELECT 1 FROM PROYECTO_ETAPA PE
            WHERE PE.id_Proyecto = P.id_Proyecto AND PE.tipo = ?
          )
    `, [TIPO_COTIZACION]);

    for (const { id_Proyecto } of candidatos) {
        const idEtapa = await getPrimeraEtapaCotizacion(executor, id_Proyecto);
        if (!idEtapa) continue;

        const primeraAct = await executor.query(
            `SELECT id FROM PROYECTO_ACTIVIDAD
             WHERE id_proyecto_etapa = ? AND estado = 'no comenzado'
             ORDER BY orden ASC, id ASC
             LIMIT 1`,
            [idEtapa],
        );
        const idActividad = primeraAct[0]?.id ?? null;

        await executor.query(
            `UPDATE PROYECTO_ETAPA SET estado = 'completada'
             WHERE id_Proyecto = ? AND tipo = ? AND estado = 'en progreso'`,
            [id_Proyecto, TIPO_PENDIENTE],
        );
        await executor.query(
            `UPDATE PROYECTO_ETAPA SET estado = 'en progreso'
             WHERE id = ? AND estado = 'no comenzado'`,
            [idEtapa],
        );
        if (idActividad) {
            await executor.query(
                `UPDATE PROYECTO_ACTIVIDAD SET estado = 'en progreso'
                 WHERE id = ? AND estado = 'no comenzado'`,
                [idActividad],
            );
        }
        await executor.query(
            `UPDATE PROYECTO SET
                estado = 'En Ejecución',
                etapa_actual_id = ?,
                actividad_actual_id = ?
             WHERE id_Proyecto = ?`,
            [idEtapa, idActividad, id_Proyecto],
        );
    }
}

async function ensureTerminadoEtapaForProyectosCompletados(executor) {
    const completados = await executor.query(`
        SELECT P.id_Proyecto
        FROM PROYECTO P
        WHERE P.estado = 'Completado'
          AND NOT EXISTS (
            SELECT 1 FROM PROYECTO_ETAPA PE
            WHERE PE.id_Proyecto = P.id_Proyecto AND PE.tipo = ?
          )
    `, [TIPO_TERMINADO]);

    for (const { id_Proyecto } of completados) {
        const etapaCotizacion = await executor.query(
            `SELECT id FROM PROYECTO_ETAPA
             WHERE id_Proyecto = ? AND tipo = ? AND estado <> 'completada'
             ORDER BY orden ASC, id ASC`,
            [id_Proyecto, TIPO_COTIZACION],
        );
        for (const row of etapaCotizacion) {
            await executor.query(
                `UPDATE PROYECTO_ETAPA SET estado = 'completada' WHERE id = ?`,
                [row.id],
            );
        }
        await executor.query(
            `UPDATE PROYECTO_ACTIVIDAD SET estado = 'completada'
             WHERE id_Proyecto = ? AND estado <> 'completada'`,
            [id_Proyecto],
        );
        await executor.query(
            `UPDATE PROYECTO_ETAPA SET estado = 'completada'
             WHERE id_Proyecto = ? AND tipo = ? AND estado = 'en progreso'`,
            [id_Proyecto, TIPO_PENDIENTE],
        );

        const terminadoResult = await executor.query(
            `INSERT INTO PROYECTO_ETAPA
                (id_Proyecto, tipo, nombre, descripcion, duracion, orden, estado)
             VALUES (?, ?, ?, NULL, 0, 999999, 'completada')`,
            [id_Proyecto, TIPO_TERMINADO, NOMBRE_ETAPA_TERMINADO],
        );
        await executor.query(
            `UPDATE PROYECTO SET etapa_actual_id = ?, actividad_actual_id = NULL WHERE id_Proyecto = ?`,
            [terminadoResult.insertId, id_Proyecto],
        );
    }

    const yaConTerminado = await executor.query(`
        SELECT P.id_Proyecto, PE.id AS id_etapa_terminado
        FROM PROYECTO P
        INNER JOIN PROYECTO_ETAPA PE ON PE.id_Proyecto = P.id_Proyecto AND PE.tipo = ?
        WHERE P.estado = 'Completado'
          AND (P.etapa_actual_id IS NULL OR P.etapa_actual_id <> PE.id)
    `, [TIPO_TERMINADO]);
    for (const row of yaConTerminado) {
        await executor.query(
            `UPDATE PROYECTO SET etapa_actual_id = ?, actividad_actual_id = NULL WHERE id_Proyecto = ?`,
            [row.id_etapa_terminado, row.id_Proyecto],
        );
    }
}

/** Recalcula fecha_inicio/fecha_fin de etapas y actividades según INFORME (fecha + hora de ocurrencia). */
async function recalcFechasEtapasDesdeInformes(executor, idProyecto) {
    await executor.query(
        `UPDATE PROYECTO_ACTIVIDAD PA
         INNER JOIN PROYECTO_ETAPA PE ON PE.id = PA.id_proyecto_etapa
         SET PA.fecha_inicio = NULL, PA.fecha_fin = NULL
         WHERE PA.id_Proyecto = ? AND PE.tipo = ?`,
        [idProyecto, TIPO_COTIZACION],
    );
    await executor.query(
        `UPDATE PROYECTO_ETAPA SET fecha_inicio = NULL, fecha_fin = NULL
         WHERE id_Proyecto = ? AND tipo = ?`,
        [idProyecto, TIPO_COTIZACION],
    );

    await executor.query(
        `UPDATE PROYECTO_ACTIVIDAD PA
         INNER JOIN (
             SELECT id_proyecto_actividad,
                    MIN(TIMESTAMP(I.fecha, I.hora)) AS f_ini,
                    MAX(TIMESTAMP(I.fecha, I.hora)) AS f_fin
             FROM INFORME I
             WHERE I.id_Proyecto = ?
               AND I.id_proyecto_actividad IS NOT NULL
               AND I.fecha IS NOT NULL
             GROUP BY id_proyecto_actividad
         ) agg ON agg.id_proyecto_actividad = PA.id
         SET PA.fecha_inicio = agg.f_ini, PA.fecha_fin = agg.f_fin
         WHERE PA.id_Proyecto = ?`,
        [idProyecto, idProyecto],
    );

    await executor.query(
        `UPDATE PROYECTO_ETAPA PE
         INNER JOIN (
             SELECT pe_id, MIN(ts) AS f_ini, MAX(ts) AS f_fin
             FROM (
                 SELECT I.id_proyecto_etapa AS pe_id, TIMESTAMP(I.fecha, I.hora) AS ts
                 FROM INFORME I
                 INNER JOIN PROYECTO_ETAPA PE2 ON PE2.id = I.id_proyecto_etapa AND PE2.tipo = ?
                 WHERE I.id_Proyecto = ?
                   AND I.id_proyecto_etapa IS NOT NULL
                   AND I.fecha IS NOT NULL
                 UNION ALL
                 SELECT PA.id_proyecto_etapa AS pe_id, TIMESTAMP(I.fecha, I.hora) AS ts
                 FROM INFORME I
                 INNER JOIN PROYECTO_ACTIVIDAD PA ON PA.id = I.id_proyecto_actividad
                 WHERE I.id_Proyecto = ?
                   AND I.id_proyecto_actividad IS NOT NULL
                   AND I.fecha IS NOT NULL
             ) ocurrencias
             GROUP BY pe_id
         ) agg ON agg.pe_id = PE.id
         SET PE.fecha_inicio = agg.f_ini, PE.fecha_fin = agg.f_fin
         WHERE PE.id_Proyecto = ? AND PE.tipo = ?`,
        [TIPO_COTIZACION, idProyecto, idProyecto, idProyecto, TIPO_COTIZACION],
    );
}

async function loadEtapasTree(executor, idProyecto) {
    const etapas = await executor.query(
        `SELECT ${ETAPA_SELECT}
         FROM PROYECTO_ETAPA
         WHERE id_Proyecto = ?
         ORDER BY orden ASC, id ASC`,
        [idProyecto],
    );
    if (!etapas.length) return [];

    const actividades = await executor.query(
        `SELECT ${ACTIVIDAD_SELECT}
         FROM PROYECTO_ACTIVIDAD
         WHERE id_Proyecto = ?
         ORDER BY orden ASC, id ASC`,
        [idProyecto],
    );
    const actsByEtapa = new Map();
    for (const act of actividades) {
        if (!actsByEtapa.has(act.id_proyecto_etapa)) actsByEtapa.set(act.id_proyecto_etapa, []);
        actsByEtapa.get(act.id_proyecto_etapa).push(act);
    }
    return etapas.map((e) => ({
        ...e,
        actividades: actsByEtapa.get(e.id) || [],
    }));
}

async function loadEtapasTreeByProyectoIds(executor, ids) {
    const map = new Map();
    if (!ids.length) return map;

    const placeholders = ids.map(() => '?').join(',');
    const etapas = await executor.query(
        `SELECT ${ETAPA_SELECT}
         FROM PROYECTO_ETAPA
         WHERE id_Proyecto IN (${placeholders})
         ORDER BY id_Proyecto, orden ASC, id ASC`,
        ids,
    );
    const actividades = await executor.query(
        `SELECT ${ACTIVIDAD_SELECT}
         FROM PROYECTO_ACTIVIDAD
         WHERE id_Proyecto IN (${placeholders})
         ORDER BY id_Proyecto, orden ASC, id ASC`,
        ids,
    );

    for (const id of ids) map.set(id, []);
    const etapaIndex = new Map();
    for (const e of etapas) {
        const node = { ...e, actividades: [] };
        if (!map.has(e.id_Proyecto)) map.set(e.id_Proyecto, []);
        map.get(e.id_Proyecto).push(node);
        etapaIndex.set(e.id, node);
    }
    for (const act of actividades) {
        const parent = etapaIndex.get(act.id_proyecto_etapa);
        if (parent) parent.actividades.push(act);
    }
    return map;
}

function buildEtapaActual(proyecto, etapasTree) {
    if (proyecto.etapa_actual_id) {
        const etapa = etapasTree.find((e) => e.id === proyecto.etapa_actual_id);
        if (etapa) {
            return {
                id: etapa.id,
                tipo: etapa.tipo,
                id_cotizacion_etapa: etapa.id_cotizacion_etapa,
                codigo: etapa.codigo,
                nombre: etapa.nombre,
                estado: etapa.estado,
            };
        }
    }
    const pendiente = etapasTree.find((e) => e.tipo === TIPO_PENDIENTE);
    if (pendiente && ['Pendiente', 'No iniciado'].includes(proyecto.estado)) {
        return {
            id: pendiente.id,
            tipo: pendiente.tipo,
            id_cotizacion_etapa: null,
            codigo: null,
            nombre: pendiente.nombre,
            estado: pendiente.estado,
        };
    }
    return {
        estado: 'no comenzado',
        id: null,
        tipo: null,
        id_cotizacion_etapa: null,
        codigo: null,
        nombre: 'no comenzado',
    };
}

function buildActividadActual(proyecto, etapasTree) {
    if (!proyecto.actividad_actual_id) return null;
    for (const etapa of etapasTree) {
        const act = etapa.actividades.find((a) => a.id === proyecto.actividad_actual_id);
        if (act) {
            return {
                id: act.id,
                id_cotizacion_actividad: act.id_cotizacion_actividad,
                codigo: act.codigo,
                nombre: act.nombre,
                estado: act.estado,
                id_proyecto_etapa: etapa.id,
            };
        }
    }
    return null;
}

async function loadProyectoServicios(executor, idProyecto) {
    const rows = await executor.query(
        `SELECT PS.*, S.nombre AS nombre_servicio
         FROM PROYECTO_SERVICIO PS
         LEFT JOIN SERVICIO S ON S.ID_Servicio = PS.ID_Servicio
         WHERE PS.id_Proyecto = ?
         ORDER BY PS.id ASC`,
        [idProyecto],
    );
    return rows.map((r) => ({ ...r, Principal: principalToBoolean(r.Principal) }));
}

async function enrichProyecto(executor, proyecto) {
    if (!proyecto) return proyecto;
    await ensureProyectoEtapas(executor, proyecto.id_Proyecto, proyecto.id_cotizacion);
    const [etapas, servicios] = await Promise.all([
        loadEtapasTree(executor, proyecto.id_Proyecto),
        loadProyectoServicios(executor, proyecto.id_Proyecto),
    ]);
    return {
        ...proyecto,
        etapa_actual: buildEtapaActual(proyecto, etapas),
        actividad_actual: buildActividadActual(proyecto, etapas),
        etapas,
        servicios,
    };
}

async function enrichProyectos(executor, proyectos) {
    if (!proyectos.length) return [];
    const ids = proyectos.map((p) => p.id_Proyecto);
    for (const p of proyectos) {
        await ensureProyectoEtapas(executor, p.id_Proyecto, p.id_cotizacion);
    }
    const treeMap = await loadEtapasTreeByProyectoIds(executor, ids);
    const serviciosMap = new Map();
    if (ids.length) {
        const placeholders = ids.map(() => '?').join(',');
        const svcRows = await executor.query(
            `SELECT PS.*, S.nombre AS nombre_servicio
             FROM PROYECTO_SERVICIO PS
             LEFT JOIN SERVICIO S ON S.ID_Servicio = PS.ID_Servicio
             WHERE PS.id_Proyecto IN (${placeholders})
             ORDER BY PS.id ASC`,
            ids,
        );
        for (const row of svcRows) {
            if (!serviciosMap.has(row.id_Proyecto)) serviciosMap.set(row.id_Proyecto, []);
            serviciosMap.get(row.id_Proyecto).push({
                ...row,
                Principal: principalToBoolean(row.Principal),
            });
        }
    }
    return proyectos.map((p) => {
        const etapas = treeMap.get(p.id_Proyecto) || [];
        return {
            ...p,
            etapa_actual: buildEtapaActual(p, etapas),
            actividad_actual: buildActividadActual(p, etapas),
            etapas,
            servicios: serviciosMap.get(p.id_Proyecto) || [],
        };
    });
}

async function validarEtapaActividadProyecto(executor, idProyecto, idEtapa, idActividad) {
    if (idEtapa == null && idActividad == null) return;

    if (idEtapa != null) {
        const rows = await executor.query(
            `SELECT id, tipo FROM PROYECTO_ETAPA WHERE id = ? AND id_Proyecto = ?`,
            [idEtapa, idProyecto],
        );
        if (!rows.length) throw new Error('La etapa no existe o no pertenece a este proyecto');
        if (rows[0].tipo !== TIPO_COTIZACION) {
            throw new Error('Los informes solo pueden vincularse a etapas del plan de cotización');
        }
    }

    if (idActividad != null) {
        const rows = await executor.query(
            `SELECT id, id_proyecto_etapa FROM PROYECTO_ACTIVIDAD
             WHERE id = ? AND id_Proyecto = ?`,
            [idActividad, idProyecto],
        );
        if (!rows.length) throw new Error('La actividad no existe o no pertenece a este proyecto');
        if (idEtapa != null && rows[0].id_proyecto_etapa !== Number(idEtapa)) {
            throw new Error('La actividad no pertenece a la etapa indicada');
        }
    }
}

module.exports = {
    ESTADOS_ETAPA,
    TIPO_PENDIENTE,
    TIPO_COTIZACION,
    TIPO_TERMINADO,
    syncProyectoEtapasFromCotizacion,
    ensureProyectoEtapas,
    autoStartProyectoEtapas,
    ensureTerminadoEtapaForProyectosCompletados,
    loadEtapasTree,
    enrichProyecto,
    enrichProyectos,
    validarEtapaActividadProyecto,
    recalcFechasEtapasDesdeInformes,
};
