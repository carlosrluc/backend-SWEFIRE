const { enumerateDaysInclusive } = require('../utils/jornada.utils');
const { normalizeProfesionClasificacion } = require('../constants/profesionClasificacion');

const JORNADA_DEFAULT_INICIO = '08:00:00';
const JORNADA_DEFAULT_FIN = '17:00:00';

function toDateOnly(value) {
    if (!value) return null;
    return String(value).slice(0, 10);
}

function resolveServiceDates(svc, fechaInicioFallback, fechaFinFallback) {
    return {
        fechaInicio: svc.fecha_inicio || fechaInicioFallback,
        fechaFin: svc.fecha_finalizacion || fechaFinFallback,
    };
}

function isDayInPersonalRange(dia, personal) {
    const start = toDateOnly(personal.fecha_entrada);
    const end = toDateOnly(personal.fecha_salida);
    if (start && dia < start) return false;
    if (end && dia > end) return false;
    return true;
}

function takePersonalAssignee(assigneesByProf, profesion, dia, usedAssignments) {
    const queue = assigneesByProf.get(profesion);
    if (!queue?.length) return null;

    for (const candidate of queue) {
        if (!isDayInPersonalRange(dia, candidate)) continue;
        const key = `${candidate.DNI_Trabajador}|${dia}`;
        if (usedAssignments.has(key)) continue;
        usedAssignments.add(key);
        return candidate.DNI_Trabajador;
    }
    return null;
}

async function loadCotizacionPersonal(executor, quotationId) {
    if (!quotationId) return [];
    return executor.query(
        `SELECT CP.id, CP.ID_Usuario, CP.rol_en_trabajo, CP.fecha_entrada, CP.fecha_salida,
                CP.dias_trabajados, U.dni_perfil AS DNI_Trabajador
         FROM COTIZACION_PERSONAL CP
         INNER JOIN USUARIO U ON CP.ID_Usuario = U.idusuario
         WHERE CP.ID_Cotizacion = ?
         ORDER BY CP.id ASC`,
        [quotationId],
    );
}

function buildPersonalByProfesion(personalCot) {
    const map = new Map();
    for (const row of personalCot) {
        const prof = normalizeProfesionClasificacion(row.rol_en_trabajo);
        if (!prof) continue;
        if (!map.has(prof)) map.set(prof, []);
        map.get(prof).push(row);
    }
    return map;
}

async function insertTrabajo(executor, values) {
    const result = await executor.query(
        `INSERT INTO TRABAJO
            (Id_Proyecto, ID_Servicio, dia, horario_entrada, horario_salida,
             DNI_Trabajador, profesion, asistencia, comentario)
         VALUES (?,?,?,?,?,?,?,?,?)`,
        values,
    );
    return result.insertId;
}

/**
 * Genera filas TRABAJO heredando:
 * - Requerimientos por servicio (SERVICIO_PERSONAL_REQUERIDO × días del servicio)
 * - Trabajadores asignados en cotización (COTIZACION_PERSONAL → DNI_Trabajador por profesión/día)
 */
async function generarTrabajosDesdeCotizacion(
    executor,
    idProyecto,
    quotationId,
    serviciosCot = [],
    options = {},
) {
    const fechaInicioFallback = options.fechaInicioFallback ?? null;
    const fechaFinFallback = options.fechaFinFallback ?? null;

    const personalCot = await loadCotizacionPersonal(executor, quotationId);
    const assigneesByProf = buildPersonalByProfesion(personalCot);
    const usedAssignments = new Set();

    let creados = 0;
    let firstTrabajoId = null;

    const trackInsert = async (values) => {
        const id = await insertTrabajo(executor, values);
        if (firstTrabajoId == null) firstTrabajoId = id;
        creados += 1;
        return id;
    };

    for (const svc of serviciosCot) {
        const personalReq = await executor.query(
            'SELECT profesion, cantidad FROM SERVICIO_PERSONAL_REQUERIDO WHERE ID_Servicio = ?',
            [svc.ID_Servicio],
        );
        if (!personalReq.length) continue;

        const { fechaInicio, fechaFin } = resolveServiceDates(
            svc,
            fechaInicioFallback,
            fechaFinFallback,
        );
        const dias = enumerateDaysInclusive(fechaInicio, fechaFin);
        if (!dias.length) continue;

        const horarioEntrada = svc.jornada_comienzo || JORNADA_DEFAULT_INICIO;
        const horarioSalida = svc.jornada_final || JORNADA_DEFAULT_FIN;

        for (const req of personalReq) {
            const profesion = normalizeProfesionClasificacion(req.profesion) || req.profesion;
            if (!profesion) continue;
            const cantidad = Math.max(1, Number(req.cantidad) || 1);

            for (const dia of dias) {
                for (let slot = 0; slot < cantidad; slot += 1) {
                    const dni = takePersonalAssignee(
                        assigneesByProf,
                        profesion,
                        dia,
                        usedAssignments,
                    );
                    await trackInsert([
                        idProyecto,
                        svc.ID_Servicio,
                        dia,
                        horarioEntrada,
                        horarioSalida,
                        dni,
                        profesion,
                        'Programada',
                        null,
                    ]);
                }
            }
        }
    }

  // Si no hubo requerimientos por servicio pero sí personal en cotización, crear TRABAJO desde COTIZACION_PERSONAL
    if (creados === 0 && personalCot.length) {
        const principalSvc = serviciosCot.find((s) => s.Principal === 'YES') || serviciosCot[0];
        if (!principalSvc) {
            return { trabajos_creados: creados, id_trabajo_principal: firstTrabajoId };
        }

        for (const p of personalCot) {
            const profesion = normalizeProfesionClasificacion(p.rol_en_trabajo);
            if (!profesion || !p.DNI_Trabajador) continue;

            const { fechaInicio, fechaFin } = {
                fechaInicio: p.fecha_entrada || fechaInicioFallback,
                fechaFin: p.fecha_salida || fechaFinFallback,
            };
            const dias = enumerateDaysInclusive(fechaInicio, fechaFin);
            if (!dias.length) continue;

            const horarioEntrada = principalSvc.jornada_comienzo || JORNADA_DEFAULT_INICIO;
            const horarioSalida = principalSvc.jornada_final || JORNADA_DEFAULT_FIN;

            for (const dia of dias) {
                const key = `${p.DNI_Trabajador}|${dia}`;
                if (usedAssignments.has(key)) continue;
                usedAssignments.add(key);
                await trackInsert([
                    idProyecto,
                    principalSvc.ID_Servicio,
                    dia,
                    horarioEntrada,
                    horarioSalida,
                    p.DNI_Trabajador,
                    profesion,
                    'Programada',
                    null,
                ]);
            }
        }
    }

    return { trabajos_creados: creados, id_trabajo_principal: firstTrabajoId };
}

/** @deprecated Usar generarTrabajosDesdeCotizacion con quotationId */
async function generarTrabajosDesdeServiciosProyecto(executor, idProyecto, serviciosCot = [], options = {}) {
    return generarTrabajosDesdeCotizacion(executor, idProyecto, null, serviciosCot, options);
}

module.exports = {
    generarTrabajosDesdeCotizacion,
    generarTrabajosDesdeServiciosProyecto,
    JORNADA_DEFAULT_INICIO,
    JORNADA_DEFAULT_FIN,
};
