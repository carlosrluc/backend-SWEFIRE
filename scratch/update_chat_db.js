const db = require('../src/config/db');

async function run() {
    try {
        console.log("Añadiendo columna id_cliente a COTIZACION_CHAT_MENSAJE...");
        await db.query(`ALTER TABLE COTIZACION_CHAT_MENSAJE ADD COLUMN id_cliente varchar(20) COLLATE utf8mb4_unicode_ci NULL AFTER id_remitente`);
        console.log("Modificando columna tipo_remitente en COTIZACION_CHAT_MENSAJE...");
        await db.query(`ALTER TABLE COTIZACION_CHAT_MENSAJE MODIFY COLUMN tipo_remitente varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL`);
        console.log("Base de datos actualizada exitosamente.");
    } catch (e) {
        console.error("Error actualizando la base de datos:", e);
    }
    process.exit(0);
}
run();
