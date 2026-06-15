const { enumerateDaysInclusive } = require('../utils/jornada.utils');

const JORNADA_DEFAULT_INICIO = '08:00:00';
const JORNADA_DEFAULT_FIN = '17:00:00';

/**
 * Genera filas TRABAJO (una por día × cantidad × profesión requerida) para todos los servicios del proyecto.
 * DNI_Trabajador queda NULL para asignación posterior en el front.
 */
async function generarTrabajosDesdeServiciosProyecto(executor, idProyecto, serviciosCot = []) {
    let creados = 0;

    for (const svc of serviciosCot) {
        const personalReq = await executor.query(
            'SELECT profesion, cantidad FROM SERVICIO_PERSONAL_REQUERIDO WHERE ID_Servicio = ?',
            [svc.ID_Servicio],
        );
        if (!personalReq.length) continue;

        const dias = enumerateDaysInclusive(svc.fecha_inicio, svc.fecha_finalizacion);
        if (!dias.length) continue;

        const horarioEntrada = svc.jornada_comienzo || JORNADA_DEFAULT_INICIO;
        const horarioSalida = svc.jornada_final || JORNADA_DEFAULT_FIN;

        for (const req of personalReq) {
            const cantidad = Math.max(1, Number(req.cantidad) || 1);
            for (const dia of dias) {
                for (let slot = 0; slot < cantidad; slot += 1) {
                    await executor.query(
                        `INSERT INTO TRABAJO
                            (Id_Proyecto, ID_Servicio, dia, horario_entrada, horario_salida,
                             DNI_Trabajador, profesion, asistencia, comentario)
                         VALUES (?,?,?,?,?,?,?,?,?)`,
                        [
                            idProyecto,
                            svc.ID_Servicio,
                            dia,
                            horarioEntrada,
                            horarioSalida,
                            null,
                            req.profesion,
                            'Programada',
                            null,
                        ],
                    );
                    creados += 1;
                }
            }
        }
    }

    return { trabajos_creados: creados };
}

module.exports = {
    generarTrabajosDesdeServiciosProyecto,
    JORNADA_DEFAULT_INICIO,
    JORNADA_DEFAULT_FIN,
};
