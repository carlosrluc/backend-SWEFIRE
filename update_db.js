const db = require('./src/config/db');
async function run() {
    try {
        await db.query(`UPDATE SOLICITUD SET estado = 'aceptado' WHERE ID IN (SELECT id_solicitud FROM COTIZACION_COMERCIAL WHERE id_solicitud IS NOT NULL)`);
        await db.query(`UPDATE SOLICITUD SET estado = 'pendiente' WHERE ID NOT IN (SELECT id_solicitud FROM COTIZACION_COMERCIAL WHERE id_solicitud IS NOT NULL)`);
        console.log('Database updated successfully');
    } catch (e) {
        console.error(e);
    }
    process.exit(0);
}
run();
