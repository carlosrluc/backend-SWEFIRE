const db = require('../config/db');
const { enrichProyecto } = require('./proyectoEtapas.service');
const {
    listPlazosByCotizacion,
    buildPlazosConFechas,
} = require('./cotizacionPlazoPago.service');

function httpError(status, message) {
    const err = new Error(message);
    err.status = status;
    return err;
}

function calcDiasRealesEtapa(etapa) {
    if (!etapa.fecha_inicio || !etapa.fecha_fin) return null;
    const ini = new Date(etapa.fecha_inicio);
    const fin = new Date(etapa.fecha_fin);
    const diff = Math.round((fin - ini) / (1000 * 60 * 60 * 24));
    return Math.max(diff + 1, 0);
}

async function getResumenGastosIncidencias(idProyecto) {
    const projRows = await db.query(
        'SELECT id_Proyecto, id_cotizacion FROM PROYECTO WHERE id_Proyecto = ?',
        [idProyecto],
    );
    if (!projRows.length) throw httpError(404, 'Proyecto no encontrado');
    const idCotProyecto = projRows[0].id_cotizacion;

    const incidencias = await db.query(
        `SELECT id_incidencia, nombre_incidencia, estado
         FROM INCIDENCIA WHERE id_proyecto = ?
         ORDER BY id_incidencia ASC`,
        [idProyecto],
    );

    const presRows = idCotProyecto ? await db.query(
        `SELECT ID_Incidencia,
                SUM(costo_total) AS total_presupuestado,
                SUM(COALESCE(costo_real, 0)) AS total_real,
                SUM(COALESCE(diferencia, 0)) AS total_diferencia,
                COUNT(*) AS lineas
         FROM PRESUPUESTO
         WHERE ID_Cotizacion = ? AND ID_Incidencia IS NOT NULL
         GROUP BY ID_Incidencia`,
        [idCotProyecto],
    ) : [];

    const presMap = new Map(presRows.map((r) => [r.ID_Incidencia, r]));

    const cotIncRows = await db.query(
        `SELECT CC.Id_incidencia, CC.ID, CC.nombre, CC.precio_total, CC.estado
         FROM COTIZACION_COMERCIAL CC
         INNER JOIN INCIDENCIA I ON I.id_incidencia = CC.Id_incidencia
         WHERE I.id_proyecto = ? AND CC.desactualizado = 'NO'
         ORDER BY CC.Id_incidencia, CC.version DESC`,
        [idProyecto],
    );
    const cotIncMap = new Map();
    for (const row of cotIncRows) {
        if (!cotIncMap.has(row.Id_incidencia)) cotIncMap.set(row.Id_incidencia, row);
    }

    const porIncidencia = incidencias.map((inc) => {
        const pres = presMap.get(inc.id_incidencia) || {};
        const cotInc = cotIncMap.get(inc.id_incidencia);
        return {
            id_incidencia: inc.id_incidencia,
            nombre_incidencia: inc.nombre_incidencia,
            estado: inc.estado,
            gastos: {
                lineas_presupuesto: Number(pres.lineas) || 0,
                total_presupuestado: Number(pres.total_presupuestado) || 0,
                total_real: Number(pres.total_real) || 0,
                total_diferencia: Number(pres.total_diferencia) || 0,
            },
            cotizacion_incidencia: cotInc ? {
                id: cotInc.ID,
                nombre: cotInc.nombre,
                precio_total: Number(cotInc.precio_total) || 0,
                estado: cotInc.estado,
            } : null,
        };
    });

    const totales = porIncidencia.reduce(
        (acc, item) => {
            acc.total_presupuestado += item.gastos.total_presupuestado;
            acc.total_real += item.gastos.total_real;
            acc.total_diferencia += item.gastos.total_diferencia;
            acc.total_cotizado_incidencias += item.cotizacion_incidencia?.precio_total || 0;
            return acc;
        },
        {
            total_presupuestado: 0,
            total_real: 0,
            total_diferencia: 0,
            total_cotizado_incidencias: 0,
        },
    );

    return {
        id_Proyecto: idProyecto,
        id_cotizacion_proyecto: idCotProyecto,
        totales,
        incidencias: porIncidencia,
    };
}

async function getInformeEtapas(idProyecto) {
    const projRows = await db.query(
        `SELECT P.*, C.nombre_comercial AS Cliente_Nombre
         FROM PROYECTO P
         LEFT JOIN CLIENTE C ON C.DNI_O_RUC = P.Id_Cliente
         WHERE P.id_Proyecto = ?`,
        [idProyecto],
    );
    if (!projRows.length) throw httpError(404, 'Proyecto no encontrado');

    const proyecto = await enrichProyecto(db, projRows[0]);
    const idCotProyecto = proyecto.id_cotizacion;

    const etapasCotizacion = (proyecto.etapas || []).filter((e) => e.tipo === 'cotizacion');
    const comparativaEtapas = etapasCotizacion.map((e) => {
        const diasReales = calcDiasRealesEtapa(e);
        return {
            id_proyecto_etapa: e.id,
            id_cotizacion_etapa: e.id_cotizacion_etapa,
            codigo: e.codigo,
            nombre: e.nombre,
            estado: e.estado,
            dias_cotizados: Number(e.duracion) || 0,
            dias_reales: diasReales,
            diferencia_dias: diasReales !== null ? diasReales - (Number(e.duracion) || 0) : null,
            fecha_inicio: e.fecha_inicio,
            fecha_fin: e.fecha_fin,
        };
    });

    const ultimoInformeRows = await db.query(
        `SELECT I.id, I.fecha, I.hora, I.id_proyecto_etapa, I.id_proyecto_actividad,
                PE.nombre AS etapa_nombre, PA.nombre AS actividad_nombre
         FROM INFORME I
         LEFT JOIN PROYECTO_ETAPA PE ON PE.id = I.id_proyecto_etapa
         LEFT JOIN PROYECTO_ACTIVIDAD PA ON PA.id = I.id_proyecto_actividad
         WHERE I.id_Proyecto = ?
         ORDER BY I.fecha DESC, I.hora DESC, I.id DESC
         LIMIT 1`,
        [idProyecto],
    );

    const incidenciasPrincipal = await db.query(
        `SELECT I.id AS id_informe, I.id_incidencia, I.implicancia, I.tiempo_perdido,
                I.fecha, I.hora, I.descripcion,
                INC.nombre_incidencia,
                PE.id AS id_proyecto_etapa, PE.nombre AS etapa_nombre, PE.codigo AS etapa_codigo,
                PA.id AS id_proyecto_actividad, PA.nombre AS actividad_nombre, PA.codigo AS actividad_codigo
         FROM INFORME I
         INNER JOIN INCIDENCIA INC ON INC.id_incidencia = I.id_incidencia
         LEFT JOIN PROYECTO_ETAPA PE ON PE.id = I.id_proyecto_etapa
         LEFT JOIN PROYECTO_ACTIVIDAD PA ON PA.id = I.id_proyecto_actividad
         WHERE I.id_Proyecto = ? AND I.implicancia = 'principal'
         ORDER BY I.fecha DESC, I.hora DESC`,
        [idProyecto],
    );

    const tiempoPerdidoPorIncidencia = await db.query(
        `SELECT I.id_incidencia,
                INC.nombre_incidencia,
                SUM(COALESCE(I.tiempo_perdido, 0)) AS horas_perdidas_total,
                SUM(CASE WHEN I.implicancia = 'principal' THEN COALESCE(I.tiempo_perdido, 0) ELSE 0 END) AS horas_principal,
                SUM(CASE WHEN I.implicancia = 'colateral' THEN COALESCE(I.tiempo_perdido, 0) ELSE 0 END) AS horas_colateral,
                COUNT(*) AS informes_vinculados
         FROM INFORME I
         INNER JOIN INCIDENCIA INC ON INC.id_incidencia = I.id_incidencia
         WHERE I.id_Proyecto = ? AND I.implicancia <> 'ninguno'
         GROUP BY I.id_incidencia, INC.nombre_incidencia
         ORDER BY horas_perdidas_total DESC`,
        [idProyecto],
    );

    const resumenGastos = await getResumenGastosIncidencias(idProyecto);

    const plazosProyecto = idCotProyecto
        ? buildPlazosConFechas(proyecto, await listPlazosByCotizacion(idCotProyecto))
        : [];

    const cotIncRows = await db.query(
        `SELECT CC.ID, CC.nombre, CC.precio_total, CC.estado, CC.Id_incidencia,
                INC.nombre_incidencia
         FROM COTIZACION_COMERCIAL CC
         INNER JOIN INCIDENCIA INC ON INC.id_incidencia = CC.Id_incidencia
         WHERE INC.id_proyecto = ? AND CC.desactualizado = 'NO'
         ORDER BY CC.Id_incidencia, CC.version DESC`,
        [idProyecto],
    );
    const cotIncUnicas = [];
    const seenInc = new Set();
    for (const row of cotIncRows) {
        if (seenInc.has(row.Id_incidencia)) continue;
        seenInc.add(row.Id_incidencia);
        const plazos = buildPlazosConFechas(proyecto, await listPlazosByCotizacion(row.ID));
        cotIncUnicas.push({
            id_cotizacion: row.ID,
            id_incidencia: row.Id_incidencia,
            nombre_incidencia: row.nombre_incidencia,
            nombre_cotizacion: row.nombre,
            precio_total: Number(row.precio_total) || 0,
            estado: row.estado,
            plazos_pago: plazos,
            proximo_pago: plazos.find((p) => p.dias_faltantes !== null && p.dias_faltantes >= 0) || plazos[0] || null,
        });
    }

    const proximoPagoProyecto = plazosProyecto.find((p) => p.dias_faltantes !== null && p.dias_faltantes >= 0)
        || plazosProyecto[0]
        || null;

    return {
        id_Proyecto: idProyecto,
        proyecto: {
            id_Proyecto: proyecto.id_Proyecto,
            Proyecto_Nombre: proyecto.Proyecto_Nombre,
            estado: proyecto.estado,
            fecha_inicio: proyecto.fecha_inicio,
            fecha_fin: proyecto.fecha_fin,
            id_cotizacion: idCotProyecto,
            etapa_actual: proyecto.etapa_actual,
            actividad_actual: proyecto.actividad_actual,
        },
        etapa_mas_reciente: ultimoInformeRows[0] ? {
            id_informe: ultimoInformeRows[0].id,
            fecha: ultimoInformeRows[0].fecha,
            hora: ultimoInformeRows[0].hora,
            id_proyecto_etapa: ultimoInformeRows[0].id_proyecto_etapa,
            etapa_nombre: ultimoInformeRows[0].etapa_nombre,
            id_proyecto_actividad: ultimoInformeRows[0].id_proyecto_actividad,
            actividad_nombre: ultimoInformeRows[0].actividad_nombre,
        } : proyecto.etapa_actual,
        comparativa_etapas: comparativaEtapas,
        incidencias_implicancia_principal: incidenciasPrincipal,
        tiempo_perdido_por_incidencia: tiempoPerdidoPorIncidencia.map((r) => ({
            ...r,
            horas_perdidas_total: Number(r.horas_perdidas_total) || 0,
            horas_principal: Number(r.horas_principal) || 0,
            horas_colateral: Number(r.horas_colateral) || 0,
        })),
        resumen_gastos_incidencias: resumenGastos,
        pagos: {
            cotizacion_proyecto: {
                id_cotizacion: idCotProyecto,
                plazos_pago: plazosProyecto,
                proximo_pago: proximoPagoProyecto,
                dias_hasta_pago_completo: proximoPagoProyecto?.dias_faltantes ?? null,
            },
            cotizaciones_incidencia: cotIncUnicas,
        },
    };
}

module.exports = {
    getInformeEtapas,
    getResumenGastosIncidencias,
};
