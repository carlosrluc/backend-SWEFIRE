const db = require('../config/db');

const IMPLICANCIAS = new Set(['ninguno', 'colateral', 'principal']);

function parseImplicancia(value, fallback = 'ninguno') {
    if (value === undefined || value === null || value === '') return fallback;
    const v = String(value).toLowerCase();
    if (!IMPLICANCIAS.has(v)) {
        throw new Error('implicancia inválida: use ninguno, colateral o principal');
    }
    return v;
}

function parseTiempoPerdido(value) {
    if (value === undefined || value === null || value === '') return null;
    const n = Number(value);
    if (Number.isNaN(n) || n < 0) throw new Error('tiempo_perdido inválido');
    return Math.round(n * 100) / 100;
}

async function listPlazosByCotizacion(cotizacionId, executor = db) {
    return executor.query(
        `SELECT id, ID_Cotizacion, porcentaje, plazo_de_pago, orden
         FROM COTIZACION_PLAZO_PAGO
         WHERE ID_Cotizacion = ?
         ORDER BY orden ASC, id ASC`,
        [cotizacionId],
    );
}

async function replacePlazosCotizacion(cotizacionId, plazos, executor = db) {
    if (!Array.isArray(plazos)) {
        throw new Error('plazos_pago debe ser un array');
    }
    let totalPct = 0;
    for (let i = 0; i < plazos.length; i++) {
        const p = plazos[i];
        const pct = Number(p.porcentaje);
        const plazo = Number(p.plazo_de_pago ?? 0);
        if (Number.isNaN(pct) || pct <= 0 || pct > 100) {
            throw new Error(`plazos_pago[${i}].porcentaje inválido`);
        }
        if (Number.isNaN(plazo) || plazo < 0) {
            throw new Error(`plazos_pago[${i}].plazo_de_pago inválido`);
        }
        totalPct += pct;
    }
    if (plazos.length && Math.abs(totalPct - 100) > 0.01) {
        throw new Error(`La suma de porcentajes debe ser 100 (actual: ${totalPct})`);
    }

    await executor.query('DELETE FROM COTIZACION_PLAZO_PAGO WHERE ID_Cotizacion = ?', [cotizacionId]);
    for (let i = 0; i < plazos.length; i++) {
        const p = plazos[i];
        await executor.query(
            `INSERT INTO COTIZACION_PLAZO_PAGO (ID_Cotizacion, porcentaje, plazo_de_pago, orden)
             VALUES (?,?,?,?)`,
            [cotizacionId, p.porcentaje, p.plazo_de_pago ?? 0, p.orden ?? (i + 1)],
        );
    }
    return listPlazosByCotizacion(cotizacionId, executor);
}

function addDays(dateStr, days) {
    const d = new Date(`${dateStr}T12:00:00`);
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
}

function daysUntil(fromDateStr, toDateStr) {
    const from = new Date(`${fromDateStr}T12:00:00`);
    const to = new Date(`${toDateStr}T12:00:00`);
    return Math.round((to - from) / (1000 * 60 * 60 * 24));
}

function buildPlazosConFechas(proyecto, plazos) {
    const hoy = new Date().toISOString().slice(0, 10);
    const fechaInicio = proyecto.fecha_inicio;
    const fechaFin = proyecto.fecha_fin;

    return plazos.map((p) => {
        const plazo = Number(p.plazo_de_pago) || 0;
        let fechaReferencia;
        let momentoPago;
        if (plazo === 0) {
            fechaReferencia = fechaInicio;
            momentoPago = 'antes_de_iniciar_proyecto';
        } else {
            fechaReferencia = fechaFin ? addDays(fechaFin, plazo) : null;
            momentoPago = 'despues_de_finalizar_proyecto';
        }
        const diasFaltantes = fechaReferencia ? daysUntil(hoy, fechaReferencia) : null;
        return {
            ...p,
            porcentaje: Number(p.porcentaje),
            plazo_de_pago: plazo,
            momento_pago: momentoPago,
            fecha_pago_estimada: fechaReferencia,
            dias_faltantes: diasFaltantes,
            vencido: diasFaltantes !== null && diasFaltantes < 0,
        };
    });
}

function getPagoInicial(plazos) {
    const inicial = plazos.find((p) => Number(p.plazo_de_pago) === 0);
    if (!inicial) return null;
    return {
        porcentaje: Number(inicial.porcentaje),
        plazo_de_pago: 0,
    };
}

module.exports = {
    IMPLICANCIAS,
    parseImplicancia,
    parseTiempoPerdido,
    listPlazosByCotizacion,
    replacePlazosCotizacion,
    buildPlazosConFechas,
    getPagoInicial,
    addDays,
    daysUntil,
};
