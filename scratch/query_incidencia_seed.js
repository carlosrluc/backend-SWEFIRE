require('dotenv').config();
const mysql = require('mysql2/promise');

(async () => {
    const pool = mysql.createPool({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : null,
    });

    const [proyectos] = await pool.query(
        "SELECT id_Proyecto, Proyecto_Nombre, Id_Cliente, ubicacion, estado, id_cotizacion FROM PROYECTO WHERE estado IN ('En Ejecución','Completado') ORDER BY estado, id_Proyecto",
    );
    console.log('PROYECTOS', JSON.stringify(proyectos, null, 2));

    const [inc] = await pool.query('SELECT id_incidencia, nombre_incidencia, id_proyecto, estado FROM INCIDENCIA ORDER BY id_incidencia');
    console.log('INCIDENCIAS', JSON.stringify(inc, null, 2));

    if (proyectos.length) {
        const ids = proyectos.map((p) => p.id_Proyecto);
        const [inv] = await pool.query(
            `SELECT pi.id, pi.id_Proyecto, pi.Id_Objeto, pi.cantidad_objeto, i.nombre_objeto, i.precio_comercial
             FROM PROYECTO_INVENTARIO pi
             JOIN INVENTARIO i ON pi.Id_Objeto = i.Id_Objeto
             WHERE pi.id_Proyecto IN (?)
             ORDER BY pi.id_Proyecto, pi.id`,
            [ids],
        );
        console.log('INVENTARIO', JSON.stringify(inv, null, 2));

        const [cam] = await pool.query(
            `SELECT pc.id, pc.id_Proyecto, pc.Placa, c.nombre
             FROM PROYECTO_CAMION pc
             LEFT JOIN CAMION c ON pc.Placa = c.Placa
             WHERE pc.id_Proyecto IN (?)
             ORDER BY pc.id_Proyecto, pc.id`,
            [ids],
        );
        console.log('CAMIONES', JSON.stringify(cam, null, 2));
    }

    const [perfiles] = await pool.query(
        'SELECT DNI, Nombre, Apellido FROM PERFIL WHERE DNI IN (SELECT dni_perfil FROM USUARIO LIMIT 10) LIMIT 8',
    );
    console.log('PERFILES', JSON.stringify(perfiles, null, 2));

    const [trabajadores] = await pool.query(
        `SELECT DISTINCT tj.DNI_Trabajador, p.Nombre, p.Apellido
         FROM TRABAJO_JORNADA tj
         JOIN PERFIL p ON tj.DNI_Trabajador = p.DNI
         LIMIT 5`,
    );
    console.log('TRABAJADORES', JSON.stringify(trabajadores, null, 2));

    await pool.end();
})().catch((e) => {
    console.error(e);
    process.exit(1);
});
