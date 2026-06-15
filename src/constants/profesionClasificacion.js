/** Valores permitidos para profesion_clasificacion y SERVICIO_PERSONAL_REQUERIDO.profesion */
const PROFESION_CLASIFICACION_VALUES = [
    'bombero',
    'ingeniero de sistemas',
    'ingeniero sanitario',
    'SSOMA',
    'Supervisor de planta',
    'ingeniero ambiental',
    'mecanico',
    'tecnico',
    'arquitecto',
    'piloto',
    'otros',
];

const PROFESION_CLASIFICACION_SQL = PROFESION_CLASIFICACION_VALUES
    .map((v) => `'${v.replace(/'/g, "''")}'`)
    .join(',');

function normalizeProfesionClasificacion(value) {
    if (value === undefined || value === null || value === '') return null;
    const raw = String(value).trim();
    const found = PROFESION_CLASIFICACION_VALUES.find(
        (p) => p.toLowerCase() === raw.toLowerCase(),
    );
    return found ?? null;
}

function assertProfesionClasificacion(value, { required = false } = {}) {
    if (value === undefined || value === null || value === '') {
        if (required) throw new Error('profesion es requerida');
        return null;
    }
    const normalized = normalizeProfesionClasificacion(value);
    if (!normalized) {
        throw new Error(
            `profesion inválida. Valores permitidos: ${PROFESION_CLASIFICACION_VALUES.join(', ')}`,
        );
    }
    return normalized;
}

module.exports = {
    PROFESION_CLASIFICACION_VALUES,
    PROFESION_CLASIFICACION_SQL,
    normalizeProfesionClasificacion,
    assertProfesionClasificacion,
};
