async function createMovimiento(conn, m) {
  const {
    Id_Objeto,
    cantidad,
    tipo_movimiento,
    origen_tipo = null,
    origen_id = null,
    destino_tipo = null,
    destino_id = null,
    referencia_tabla = null,
    referencia_id = null,
    razon = null,
  } = m;

  await conn.query(
    `INSERT INTO INVENTARIO_MOVIMIENTO
      (Id_Objeto, cantidad, tipo_movimiento, origen_tipo, origen_id, destino_tipo, destino_id, referencia_tabla, referencia_id, razon)
     VALUES (?,?,?,?,?,?,?,?,?,?)`,
    [
      Id_Objeto,
      cantidad,
      tipo_movimiento,
      origen_tipo,
      origen_id,
      destino_tipo,
      destino_id,
      referencia_tabla,
      referencia_id,
      razon,
    ],
  );
}

module.exports = { createMovimiento };

