function normalizeTimePart(value) {
    if (value === undefined || value === null || value === '') return null;
    const raw = String(value).trim();
    const match = raw.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
    if (!match) return null;
    const h = String(match[1]).padStart(2, '0');
    const m = match[2];
    const s = match[3] ?? '00';
    return `${h}:${m}:${s}`;
}

function parseJornadaRange(text) {
    if (!text) return { inicio: null, fin: null };
    const parts = String(text).split(/\s*[-–—]\s*/);
    if (parts.length < 2) {
        const single = normalizeTimePart(parts[0]);
        return { inicio: single, fin: null };
    }
    return {
        inicio: normalizeTimePart(parts[0]),
        fin: normalizeTimePart(parts[1]),
    };
}

function resolveJornadaFromItem(item = {}) {
    const inicio = normalizeTimePart(
        item.jornada_comienzo ?? item.scheduleStart ?? item.jornadaComienzo,
    );
    const fin = normalizeTimePart(
        item.jornada_final ?? item.scheduleEnd ?? item.jornadaFinal,
    );
    if (inicio || fin) {
        return {
            jornada_comienzo: inicio,
            jornada_final: fin,
        };
    }
    const legacy = parseJornadaRange(item.jornada ?? item.schedule ?? item.horario_servicio);
    return {
        jornada_comienzo: legacy.inicio,
        jornada_final: legacy.fin,
    };
}

function formatJornadaSchedule(inicio, fin) {
    const a = inicio ? String(inicio).slice(0, 5) : '';
    const b = fin ? String(fin).slice(0, 5) : '';
    if (a && b) return `${a} - ${b}`;
    return a || b || '';
}

function enumerateDaysInclusive(fechaInicio, fechaFin) {
    if (!fechaInicio || !fechaFin) return [];
    const start = new Date(`${String(fechaInicio).slice(0, 10)}T00:00:00`);
    const end = new Date(`${String(fechaFin).slice(0, 10)}T00:00:00`);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return [];
    const dias = [];
    const cursor = new Date(start);
    while (cursor <= end) {
        dias.push(cursor.toISOString().slice(0, 10));
        cursor.setDate(cursor.getDate() + 1);
    }
    return dias;
}

module.exports = {
    normalizeTimePart,
    parseJornadaRange,
    resolveJornadaFromItem,
    formatJornadaSchedule,
    enumerateDaysInclusive,
};
