const db = require('./src/config/db');

async function test() {
    try {
        console.log("Testing insert with invalid string");
        const [result] = await db.query(
            'INSERT INTO SOLICITUD (Id_Cliente,descripcion,ubicacion,ProductoEnvio,CamionesEnvio,ObsGenerales,ObsEleccion,estado,Respuesta) VALUES (?,?,?,?,?,?,?,?,?)',
            ['string', 'test', 'test', 'test', 'test', 'test', 'test', 'pendiente', 'test']
        );
        console.log(result);
    } catch (e) {
        console.error("Insert error:", e.message);
    }
    process.exit(0);
}
test();
