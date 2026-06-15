const { toDateOnly } = require('./cotizacionDto.service');

function pagoPorDiaToBoolean(value) {
    return value === 'YES' || value === true;
}

function toPagoPorDiaEnum(value) {
    if (value === true || value === 'YES' || value === 'yes') return 'YES';
    if (value === false || value === 'NO' || value === 'no') return 'NO';
    return 'NO';
}

/** Suma días calendario a una fecha ISO (YYYY-MM-DD). */
function addDays(fechaIso, dias) {
    if (!fechaIso) return null;
    const d = new Date(`${String(fechaIso).slice(0, 10)}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + Number(dias) || 0);
    return d.toISOString().slice(0, 10);
}

/**
 * Construye línea de tiempo por etapas ordenadas.
 * fecha_finalizacion de cada etapa = fecha_inicio + duracion (días).
 * La siguiente etapa comienza donde termina la anterior.
 */
function buildEtapaTimeline(etapas, fechaInicioProyecto) {
    const inicio = toDateOnly(fechaInicioProyecto);
    if (!inicio) return [];

    const sorted = [...etapas].sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));
    let cursor = inicio;
    const timeline = [];

    for (const etapa of sorted) {
        const duracion = Math.max(0, Number(etapa.duracion) || 0);
        const fecha_inicio = cursor;
        const fecha_finalizacion = duracion > 0 ? addDays(fecha_inicio, duracion) : fecha_inicio;
        cursor = fecha_finalizacion;
        timeline.push({
            id: etapa.id ?? null,
            orden: etapa.orden,
            nombre: etapa.nombre,
            duracion,
            fecha_inicio,
            fecha_finalizacion,
        });
    }
    return timeline;
}

function getPrincipalFechasFromTimeline(timeline) {
    if (!timeline.length) {
        return { fecha_inicio: null, fecha_finalizacion: null, dias: 0 };
    }
    const dias = timeline.reduce((sum, e) => sum + e.duracion, 0);
    return {
        fecha_inicio: timeline[0].fecha_inicio,
        fecha_finalizacion: timeline[timeline.length - 1].fecha_finalizacion,
        dias,
    };
}

function getEtapaFechasFromTimeline(timeline, { idEtapa, ordenEtapa } = {}) {
    let slot = null;
    if (idEtapa != null) {
        slot = timeline.find((e) => Number(e.id) === Number(idEtapa));
    }
    if (!slot && ordenEtapa != null) {
        slot = timeline.find((e) => Number(e.orden) === Number(ordenEtapa));
    }
    if (!slot) {
        return { fecha_inicio: null, fecha_finalizacion: null, dias: 0 };
    }
    return {
        fecha_inicio: slot.fecha_inicio,
        fecha_finalizacion: slot.fecha_finalizacion,
        dias: slot.duracion,
    };
}

function calcularPrecioServicio(precioComercial, pagoPorDia, dias) {
    const precio = Number(precioComercial) || 0;
    if (!pagoPorDia) return precio;
    const nDias = Math.max(1, Number(dias) || 0);
    return Math.round(precio * nDias * 100) / 100;
}

function enrichEtapasConFechas(etapas, fechaInicioProyecto) {
    const timeline = buildEtapaTimeline(etapas, fechaInicioProyecto);
    const byId = new Map(timeline.filter((t) => t.id != null).map((t) => [Number(t.id), t]));
    const byOrden = new Map(timeline.map((t) => [Number(t.orden), t]));

    return etapas.map((e) => {
        const slot = (e.id != null && byId.get(Number(e.id)))
            || byOrden.get(Number(e.orden));
        return {
            ...e,
            fecha_inicio: slot?.fecha_inicio ?? null,
            fecha_finalizacion: slot?.fecha_finalizacion ?? null,
        };
    });
}

function enrichSubserviciosConFechas(subservicios, etapas, fechaInicioProyecto) {
    const timeline = buildEtapaTimeline(etapas, fechaInicioProyecto);
    return subservicios.map((sub) => {
        const fechas = getEtapaFechasFromTimeline(timeline, {
            idEtapa: sub.id_servicio_etapa,
            ordenEtapa: sub.orden_etapa ?? sub.ubicacion_etapa?.orden,
        });
        return {
            ...sub,
            fecha_inicio: fechas.fecha_inicio,
            fecha_finalizacion: fechas.fecha_finalizacion,
            dias: fechas.dias,
        };
    });
}

module.exports = {
    pagoPorDiaToBoolean,
    toPagoPorDiaEnum,
    addDays,
    buildEtapaTimeline,
    getPrincipalFechasFromTimeline,
    getEtapaFechasFromTimeline,
    calcularPrecioServicio,
    enrichEtapasConFechas,
    enrichSubserviciosConFechas,
};
