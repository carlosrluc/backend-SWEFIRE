const db = require('./src/config/db');

async function test() {
    try {
        console.log("Testing update directly");
        const [result] = await db.query(
            'UPDATE SOLICITUD SET Id_Cliente=?,descripcion=?,ubicacion=?,ProductoEnvio=?,CamionesEnvio=?,ObsGenerales=?,ObsEleccion=?,estado=?,Respuesta=?,FechaCreacion=? WHERE ID=?',
            ['20501234567', 'test', 'test', 'test', 'test', 'test', 'test', 'pendiente', 'test', 1]
        );
        console.log(result);
    } catch (e) {
        console.error(e);
    }
    process.exit(0);
}
test();
