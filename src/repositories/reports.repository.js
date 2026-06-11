const db = require('../config/db');

const ReportRepository = {
    async getAll(projectID, params) {
        const { page, nombre, limit } = params;
        const offset = (page - 1) * limit;
        const baseArgs = [projectID]
        const whereClauses = [`i.id_Proyecto = (?)`];
        let mainQuery = `
        SELECT 
            i.hora,
            i.fecha,
            i.nombre,
            P.Proyecto_Nombre,
            PER.Nombre AS Autor_Nombre,
            PER.Apellido AS Autor_Apellido,
            i2.nombre_incidencia AS nombre_incidencia,
            i2.estado AS estado_incidencia,
            i.evidencia AS evidencia,
            pe.nombre AS etapa,
            pa.nombre AS actividad,
            i2.id_incidencia,
            i.id_proyecto_actividad AS id_actividad,
            i.id_proyecto_etapa AS id_etapa
            FROM INFORME i
            JOIN PROYECTO P ON P.id_Proyecto = i.id_Proyecto
            JOIN PERFIL PER ON PER.DNI = i.DNI_autor
            LEFT JOIN INCIDENCIA i2 
            ON i.id_incidencia =i2.id_incidencia 
            LEFT JOIN PROYECTO_ACTIVIDAD pa 
            ON i.id_proyecto_actividad = pa.id 
            LEFT JOIN PROYECTO_ETAPA pe 
            ON i.id_proyecto_etapa = pe.id 
        `;

        let countQuery = `
        SELECT 
            COUNT(*) AS total
            FROM INFORME i
            JOIN PROYECTO P ON P.id_Proyecto = i.id_Proyecto
            JOIN PERFIL PER ON PER.DNI = i.DNI_autor
            LEFT JOIN INCIDENCIA i2 
            ON i.id_incidencia =i2.id_incidencia 
            LEFT JOIN PROYECTO_ACTIVIDAD pa 
            ON i.id_proyecto_actividad = pa.id 
            LEFT JOIN PROYECTO_ETAPA pe 
            ON i.id_proyecto_etapa = pe.id 
        `;

        if (nombre && nombre.trim() !== "") {
            baseArgs.push(`%${nombre}%`)
            whereClauses.push(`i.nombre LIKE (?)`)
        }

        const condition = ' WHERE ' + whereClauses.join(' AND ');
        mainQuery += condition;
        countQuery += condition;

        const countArgs = [...baseArgs];
        mainQuery += ' ORDER BY i.fecha DESC, i.hora DESC LIMIT ? OFFSET ?';
        baseArgs.push(limit, offset);

        const [mainRes, countRes] = await Promise.allSettled([
            db.query(mainQuery, baseArgs),
            db.query(countQuery, countArgs),
        ]);

        const errors = [];
        if (mainRes.status === 'rejected') errors.push(mainRes.reason);
        if (countRes.status === 'rejected') errors.push(countRes.reason);

        if (errors.length > 0) {
            // Throw combined error (keep originals available on `errors` property)
            const err = new Error('One or more queries failed');
            err.errors = errors;
            throw err;
        }

        const rows = mainRes.value;
        const total = countRes.value[0].total;


        return ({
            data: rows,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        });
    },
    async getByID(projectID, reportID) {
        const queryResult = await db.query(`
            SELECT
            i.id,
            i.nombre,
            P.Proyecto_Nombre,
            PER.Nombre AS Autor_Nombre,
            PER.Apellido AS Autor_Apellido,
            i.descripcion,
            i.evidencia,
            i.fecha,
            i.hora,
            i.ubicacion,
            i.DNI_autor,
            i.fecha_registro,
            i2.nombre_incidencia AS nombre_incidencia,
            i2.estado AS estado_incidencia,
            i.evidencia AS evidencia,
            pe.nombre AS etapa,
            pa.nombre AS actividad,
            i2.id_incidencia,
            i.id_proyecto_actividad AS id_actividad,
            i.id_proyecto_etapa AS id_etapa
            FROM INFORME i
            JOIN PROYECTO P ON P.id_Proyecto = i.id_Proyecto
            JOIN PERFIL PER ON PER.DNI = i.DNI_autor
            LEFT JOIN INCIDENCIA i2 
            ON i.id_incidencia =i2.id_incidencia 
            LEFT JOIN PROYECTO_ACTIVIDAD pa 
            ON i.id_proyecto_actividad = pa.id 
            LEFT JOIN PROYECTO_ETAPA pe 
            ON i.id_proyecto_etapa = pe.id
            WHERE i.id_Proyecto = (?) AND i.id = (?)
        `, [projectID, reportID])


            
        return queryResult[0]
    }
}

module.exports = ReportRepository