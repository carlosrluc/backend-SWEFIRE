const { createMovimiento } = require('./inventarioMovimiento.service');

async function withTx(db, fn) {
  const conn = await db.getConnection();
  try {
    // Normalizar conn.query para que retorne solo "rows" como db.query
    const origQuery = conn.query.bind(conn);
    conn.query = async (sql, params) => {
      const [rows] = await origQuery(sql, params);
      return rows;
    };

    await conn.beginTransaction();
    const out = await fn(conn);
    await conn.commit();
    return out;
  } catch (e) {
    try {
      await conn.rollback();
    } catch (_) {}
    throw e;
  } finally {
    conn.release();
  }
}

async function getInventarioCantidad(conn, Id_Objeto) {
  const rows = await conn.query('SELECT cantidad FROM INVENTARIO WHERE Id_Objeto = ? FOR UPDATE', [Id_Objeto]);
  if (!rows.length) throw new Error('Inventario no encontrado');
  return rows[0].cantidad ?? 0;
}

async function updateInventarioCantidad(conn, Id_Objeto, nuevaCantidad) {
  await conn.query('UPDATE INVENTARIO SET cantidad = ? WHERE Id_Objeto = ?', [nuevaCantidad, Id_Objeto]);
}

async function addToInventarioCantidad(conn, Id_Objeto, delta) {
  await conn.query('UPDATE INVENTARIO SET cantidad = cantidad + ? WHERE Id_Objeto = ?', [delta, Id_Objeto]);
}

async function addToMermaPerdida(conn, Id_Objeto, delta) {
  await conn.query('UPDATE INVENTARIO SET merma_perdida = merma_perdida + ? WHERE Id_Objeto = ?', [delta, Id_Objeto]);
}

async function ensureCamionInventarioRow(conn, Placa, Id_Objeto) {
  const rows = await conn.query(
    'SELECT id FROM CAMION_INVENTARIO WHERE Placa = ? AND Id_Objeto = ?',
    [Placa, Id_Objeto],
  );
  if (rows.length) return rows[0].id;

  const r = await conn.query(
    `INSERT INTO CAMION_INVENTARIO
      (Placa, Id_Objeto, cantidad_requerida, cantidad_actual, ubicacion_en_camion, requerido_legal)
     VALUES (?,?,?,?,?,?)`,
    [Placa, Id_Objeto, 0, 0, null, 'no'],
  );
  return r.insertId;
}

async function moveTallerToCamion(conn, { Placa, Id_Objeto, cantidad, razon = null, referencia_id = null }) {
  if (!cantidad || cantidad <= 0) return;

  const actual = await getInventarioCantidad(conn, Id_Objeto);
  if (actual < cantidad) throw new Error('Stock insuficiente en taller');

  await updateInventarioCantidad(conn, Id_Objeto, actual - cantidad);
  await ensureCamionInventarioRow(conn, Placa, Id_Objeto);
  await conn.query(
    'UPDATE CAMION_INVENTARIO SET cantidad_actual = cantidad_actual + ? WHERE Placa = ? AND Id_Objeto = ?',
    [cantidad, Placa, Id_Objeto],
  );

  await createMovimiento(conn, {
    Id_Objeto,
    cantidad,
    tipo_movimiento: 'salida_taller_a_camion',
    origen_tipo: 'taller',
    destino_tipo: 'camion',
    destino_id: Placa,
    referencia_tabla: 'CAMION_INVENTARIO',
    referencia_id,
    razon,
  });
}

async function moveCamionToTallerAll(conn, { Placa, estado_origen, razon = null }) {
  const items = await conn.query(
    'SELECT Id_Objeto, cantidad_actual FROM CAMION_INVENTARIO WHERE Placa = ? AND cantidad_actual > 0 FOR UPDATE',
    [Placa],
  );

  for (const it of items) {
    const qty = it.cantidad_actual;
    await addToInventarioCantidad(conn, it.Id_Objeto, qty);
    await conn.query(
      'UPDATE CAMION_INVENTARIO SET cantidad_actual = 0 WHERE Placa = ? AND Id_Objeto = ?',
      [Placa, it.Id_Objeto],
    );

    await conn.query(
      `INSERT INTO CAMION_INVENTARIO_RETENCION (Placa, Id_Objeto, cantidad, estado_origen, restaurado)
       VALUES (?,?,?,?, 'no')`,
      [Placa, it.Id_Objeto, qty, estado_origen],
    );

    await createMovimiento(conn, {
      Id_Objeto: it.Id_Objeto,
      cantidad: qty,
      tipo_movimiento: 'retorno_camion_a_taller',
      origen_tipo: 'camion',
      origen_id: Placa,
      destino_tipo: 'taller',
      razon: razon || `Cambio de estado camión a ${estado_origen}`,
    });
  }
}

async function moveCamionToTaller(conn, { Placa, Id_Objeto, cantidad, razon = null, referencia_id = null }) {
  if (!cantidad || cantidad <= 0) return;

  const rows = await conn.query(
    'SELECT cantidad_actual FROM CAMION_INVENTARIO WHERE Placa = ? AND Id_Objeto = ? FOR UPDATE',
    [Placa, Id_Objeto],
  );
  if (!rows.length) throw new Error('Ítem de inventario de camión no encontrado');
  const actual = Number(rows[0].cantidad_actual || 0);
  if (actual < cantidad) throw new Error('Stock insuficiente en camión');

  await conn.query(
    'UPDATE CAMION_INVENTARIO SET cantidad_actual = cantidad_actual - ? WHERE Placa = ? AND Id_Objeto = ?',
    [cantidad, Placa, Id_Objeto],
  );
  await addToInventarioCantidad(conn, Id_Objeto, cantidad);

  await createMovimiento(conn, {
    Id_Objeto,
    cantidad,
    tipo_movimiento: 'retorno_camion_a_taller',
    origen_tipo: 'camion',
    origen_id: Placa,
    destino_tipo: 'taller',
    referencia_tabla: 'CAMION_INVENTARIO',
    referencia_id,
    razon,
  });
}

async function restoreCamionFromTaller(conn, { Placa, razon = null }) {
  const ret = await conn.query(
    `SELECT id, Id_Objeto, cantidad
     FROM CAMION_INVENTARIO_RETENCION
     WHERE Placa = ? AND restaurado = 'no'
     FOR UPDATE`,
    [Placa],
  );

  for (const r of ret) {
    const qty = r.cantidad;
    const actual = await getInventarioCantidad(conn, r.Id_Objeto);
    if (actual < qty) {
      // Si no hay stock suficiente, restauramos lo máximo posible y dejamos pendiente (simple y seguro)
      const partial = Math.max(0, actual);
      if (partial === 0) continue;
      await updateInventarioCantidad(conn, r.Id_Objeto, actual - partial);
      await ensureCamionInventarioRow(conn, Placa, r.Id_Objeto);
      await conn.query(
        'UPDATE CAMION_INVENTARIO SET cantidad_actual = cantidad_actual + ? WHERE Placa = ? AND Id_Objeto = ?',
        [partial, Placa, r.Id_Objeto],
      );
      await conn.query('UPDATE CAMION_INVENTARIO_RETENCION SET cantidad = cantidad - ? WHERE id = ?', [partial, r.id]);
      await createMovimiento(conn, {
        Id_Objeto: r.Id_Objeto,
        cantidad: partial,
        tipo_movimiento: 'salida_taller_a_camion',
        origen_tipo: 'taller',
        destino_tipo: 'camion',
        destino_id: Placa,
        razon: razon || 'Restauración parcial de inventario del camión',
      });
      continue;
    }

    await updateInventarioCantidad(conn, r.Id_Objeto, actual - qty);
    await ensureCamionInventarioRow(conn, Placa, r.Id_Objeto);
    await conn.query(
      'UPDATE CAMION_INVENTARIO SET cantidad_actual = cantidad_actual + ? WHERE Placa = ? AND Id_Objeto = ?',
      [qty, Placa, r.Id_Objeto],
    );
    await conn.query("UPDATE CAMION_INVENTARIO_RETENCION SET restaurado = 'si' WHERE id = ?", [r.id]);

    await createMovimiento(conn, {
      Id_Objeto: r.Id_Objeto,
      cantidad: qty,
      tipo_movimiento: 'salida_taller_a_camion',
      origen_tipo: 'taller',
      destino_tipo: 'camion',
      destino_id: Placa,
      razon: razon || 'Restauración de inventario del camión al salir de estado restringido',
    });
  }
}

async function createProyectoInventarioLoteDesdeCamion(conn, {
  id_Proyecto,
  Placa,
  Id_Objeto,
  cantidad_objeto,
  estado,
  razon,
  proyectoCamionId,
  estancia = 'para inventario',
}) {
  if (!cantidad_objeto || cantidad_objeto <= 0) throw new Error('cantidad_objeto inválida');

  // lock camion item
  await ensureCamionInventarioRow(conn, Placa, Id_Objeto);
  const camionRows = await conn.query(
    'SELECT cantidad_actual FROM CAMION_INVENTARIO WHERE Placa = ? AND Id_Objeto = ? FOR UPDATE',
    [Placa, Id_Objeto],
  );
  const actualCamion = camionRows[0]?.cantidad_actual ?? 0;
  if (actualCamion < cantidad_objeto) throw new Error('Stock insuficiente en camión');

  // obtener fechas desde PROYECTO_CAMION (si existe)
  let fecha_salida = null;
  let fecha_retorno = null;
  let fecha_devolucion_efectiva = null;
  if (proyectoCamionId) {
    const pc = await conn.query(
      'SELECT fecha_hora_entrada, fecha_hora_salida FROM PROYECTO_CAMION WHERE id = ?',
      [proyectoCamionId],
    );
    if (pc.length) {
      fecha_salida = pc[0].fecha_hora_entrada ? new Date(pc[0].fecha_hora_entrada) : null;
      fecha_retorno = pc[0].fecha_hora_salida ? new Date(pc[0].fecha_hora_salida) : null;
      fecha_devolucion_efectiva = pc[0].fecha_hora_salida ? new Date(pc[0].fecha_hora_salida) : null;
    }
  }

  await conn.query(
    'UPDATE CAMION_INVENTARIO SET cantidad_actual = cantidad_actual - ? WHERE Placa = ? AND Id_Objeto = ?',
    [cantidad_objeto, Placa, Id_Objeto],
  );

  const metodo_traslado = `camion: ${Placa}`;
  const estanciaFinal = estancia === 'para proyecto' ? 'para proyecto' : 'para inventario';

  const r = await conn.query(
    `INSERT INTO PROYECTO_INVENTARIO
      (id_Proyecto, Id_Objeto, cantidad_objeto, devolucion_pendiente, estado, fecha_salida, fecha_retorno, fecha_devolucion_efectiva, metodo_traslado, razon, id_proyecto_camion, estancia)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      id_Proyecto,
      Id_Objeto,
      cantidad_objeto,
      cantidad_objeto,
      estado || 'aceptable',
      fecha_salida ? fecha_salida.toISOString().slice(0, 10) : null,
      fecha_retorno ? fecha_retorno.toISOString().slice(0, 10) : null,
      fecha_devolucion_efectiva,
      metodo_traslado,
      razon || null,
      proyectoCamionId || null,
      estanciaFinal,
    ],
  );

  await createMovimiento(conn, {
    Id_Objeto,
    cantidad: cantidad_objeto,
    tipo_movimiento: 'salida_camion_a_proyecto',
    origen_tipo: 'camion',
    origen_id: Placa,
    destino_tipo: 'proyecto',
    destino_id: String(id_Proyecto),
    referencia_tabla: 'PROYECTO_INVENTARIO',
    referencia_id: r.insertId,
    razon,
  });

  return r.insertId;
}

async function createProyectoInventarioLoteDesdeTaller(conn, {
  id_Proyecto,
  Id_Objeto,
  cantidad_objeto,
  estado,
  razon,
  fecha_salida,
  fecha_retorno,
  metodo_traslado,
  estancia = 'para inventario',
}) {
  if (!cantidad_objeto || cantidad_objeto <= 0) throw new Error('cantidad_objeto inválida');

  const estanciaFinal = estancia === 'para proyecto' ? 'para proyecto' : 'para inventario';

  if (estanciaFinal === 'para inventario') {
    const actual = await getInventarioCantidad(conn, Id_Objeto);
    if (actual < cantidad_objeto) throw new Error('Stock insuficiente en taller');
    await updateInventarioCantidad(conn, Id_Objeto, actual - cantidad_objeto);
  }

  const r = await conn.query(
    `INSERT INTO PROYECTO_INVENTARIO
      (id_Proyecto, Id_Objeto, cantidad_objeto, devolucion_pendiente, estado, fecha_salida, fecha_retorno, metodo_traslado, razon, estancia)
     VALUES (?,?,?,?,?,?,?,?,?,?)`,
    [
      id_Proyecto,
      Id_Objeto,
      cantidad_objeto,
      cantidad_objeto,
      estado || 'aceptable',
      fecha_salida || null,
      fecha_retorno || null,
      metodo_traslado || null,
      razon || null,
      estanciaFinal,
    ],
  );

  if (estanciaFinal === 'para inventario') {
    await createMovimiento(conn, {
      Id_Objeto,
      cantidad: cantidad_objeto,
      tipo_movimiento: 'salida_taller_a_proyecto',
      origen_tipo: 'taller',
      destino_tipo: 'proyecto',
      destino_id: String(id_Proyecto),
      referencia_tabla: 'PROYECTO_INVENTARIO',
      referencia_id: r.insertId,
      razon,
    });
  }

  return r.insertId;
}

// Procesa retornos: PROYECTO -> CAMION según fecha_devolucion_efectiva o proyecto Completado
async function processProyectoInventarioRetornos(db) {
  return withTx(db, async (conn) => {
    const lotes = await conn.query(
      `SELECT
         PI.id,
         PI.id_Proyecto,
         PI.Id_Objeto,
         PI.devolucion_pendiente,
         PI.id_proyecto_camion,
         P.estado as proyecto_estado,
         PI.fecha_devolucion_efectiva
       FROM PROYECTO_INVENTARIO PI
       JOIN PROYECTO P ON P.id_Proyecto = PI.id_Proyecto
       WHERE PI.devolucion_pendiente > 0
         AND (
           (PI.fecha_devolucion_efectiva IS NOT NULL AND PI.fecha_devolucion_efectiva <= NOW())
           OR P.estado = 'Completado'
         )
       FOR UPDATE`,
      [],
    );

    for (const lote of lotes) {
      const qPend = lote.devolucion_pendiente;
      if (!qPend || qPend <= 0) continue;

      // Incidencias asociadas (parciales)
      const inc = await conn.query(
        `SELECT IO.cantidad, INC.estado
         FROM INCIDENCIA_OBJETOS IO
         JOIN INCIDENCIA INC ON INC.id_incidencia = IO.id_incidencia
         WHERE IO.id_proyecto_inventario = ?`,
        [lote.id],
      );

      const bloqueaEstados = new Set(['Sin enviar', 'Cotizacion sin respuesta', 'Cotizacion disputada']);
      let qBloqueada = 0;
      let qRecuperada = 0;
      let qMerma = 0;
      let qIncTotal = 0;

      for (const r of inc) {
        const c = Math.max(0, Number(r.cantidad || 0));
        qIncTotal += c;
        if (r.estado === 'Material recuperado') qRecuperada += c;
        else if (bloqueaEstados.has(r.estado)) qBloqueada += c;
        else qMerma += c;
      }

      const qAfectada = Math.min(qPend, qIncTotal);
      // cantidad libre = pendiente - afectada
      const qLibre = Math.max(0, qPend - qAfectada);
      // limitar recuperada/bloqueada/merma a lo afectado
      const scale = qIncTotal > 0 ? qAfectada / qIncTotal : 0;
      const qBloq = Math.min(qAfectada, Math.round(qBloqueada * scale));
      const qRec = Math.min(qAfectada - qBloq, Math.round(qRecuperada * scale));
      const qMer = Math.max(0, qAfectada - qBloq - qRec);

      // 1) libre siempre retorna al camión (si hay camión asociado). Si no, al taller.
      if (qLibre > 0) {
        if (lote.id_proyecto_camion) {
          const pc = await conn.query('SELECT Placa FROM PROYECTO_CAMION WHERE id = ?', [lote.id_proyecto_camion]);
          const placa = pc[0]?.Placa;
          if (placa) {
            await ensureCamionInventarioRow(conn, placa, lote.Id_Objeto);
            await conn.query(
              'UPDATE CAMION_INVENTARIO SET cantidad_actual = cantidad_actual + ? WHERE Placa = ? AND Id_Objeto = ?',
              [qLibre, placa, lote.Id_Objeto],
            );
            await createMovimiento(conn, {
              Id_Objeto: lote.Id_Objeto,
              cantidad: qLibre,
              tipo_movimiento: 'retorno_proyecto_a_camion',
              origen_tipo: 'proyecto',
              origen_id: String(lote.id_Proyecto),
              destino_tipo: 'camion',
              destino_id: placa,
              referencia_tabla: 'PROYECTO_INVENTARIO',
              referencia_id: lote.id,
              razon: 'Retorno automático (libre de incidencia)',
            });
          } else {
            await addToInventarioCantidad(conn, lote.Id_Objeto, qLibre);
            await createMovimiento(conn, {
              Id_Objeto: lote.Id_Objeto,
              cantidad: qLibre,
              tipo_movimiento: 'retorno_proyecto_a_taller',
              origen_tipo: 'proyecto',
              origen_id: String(lote.id_Proyecto),
              destino_tipo: 'taller',
              referencia_tabla: 'PROYECTO_INVENTARIO',
              referencia_id: lote.id,
              razon: 'Retorno automático (sin camión asociado)',
            });
          }
        } else {
          await addToInventarioCantidad(conn, lote.Id_Objeto, qLibre);
          await createMovimiento(conn, {
            Id_Objeto: lote.Id_Objeto,
            cantidad: qLibre,
            tipo_movimiento: 'retorno_proyecto_a_taller',
            origen_tipo: 'proyecto',
            origen_id: String(lote.id_Proyecto),
            destino_tipo: 'taller',
            referencia_tabla: 'PROYECTO_INVENTARIO',
            referencia_id: lote.id,
            razon: 'Retorno automático (sin incidencia)',
          });
        }
      }

      // 2) Recuperada retorna igual que libre
      if (qRec > 0) {
        if (lote.id_proyecto_camion) {
          const pc = await conn.query('SELECT Placa FROM PROYECTO_CAMION WHERE id = ?', [lote.id_proyecto_camion]);
          const placa = pc[0]?.Placa;
          if (placa) {
            await ensureCamionInventarioRow(conn, placa, lote.Id_Objeto);
            await conn.query(
              'UPDATE CAMION_INVENTARIO SET cantidad_actual = cantidad_actual + ? WHERE Placa = ? AND Id_Objeto = ?',
              [qRec, placa, lote.Id_Objeto],
            );
            await createMovimiento(conn, {
              Id_Objeto: lote.Id_Objeto,
              cantidad: qRec,
              tipo_movimiento: 'retorno_proyecto_a_camion',
              origen_tipo: 'proyecto',
              origen_id: String(lote.id_Proyecto),
              destino_tipo: 'camion',
              destino_id: placa,
              referencia_tabla: 'PROYECTO_INVENTARIO',
              referencia_id: lote.id,
              razon: 'Retorno automático (Material recuperado)',
            });
          } else {
            await addToInventarioCantidad(conn, lote.Id_Objeto, qRec);
            await createMovimiento(conn, {
              Id_Objeto: lote.Id_Objeto,
              cantidad: qRec,
              tipo_movimiento: 'retorno_proyecto_a_taller',
              origen_tipo: 'proyecto',
              origen_id: String(lote.id_Proyecto),
              destino_tipo: 'taller',
              referencia_tabla: 'PROYECTO_INVENTARIO',
              referencia_id: lote.id,
              razon: 'Retorno automático (Material recuperado, sin camión asociado)',
            });
          }
        } else {
          await addToInventarioCantidad(conn, lote.Id_Objeto, qRec);
          await createMovimiento(conn, {
            Id_Objeto: lote.Id_Objeto,
            cantidad: qRec,
            tipo_movimiento: 'retorno_proyecto_a_taller',
            origen_tipo: 'proyecto',
            origen_id: String(lote.id_Proyecto),
            destino_tipo: 'taller',
            referencia_tabla: 'PROYECTO_INVENTARIO',
            referencia_id: lote.id,
            razon: 'Retorno automático (Material recuperado)',
          });
        }
      }

      // 3) Merma aumenta merma_perdida
      if (qMer > 0) {
        await addToMermaPerdida(conn, lote.Id_Objeto, qMer);
        await createMovimiento(conn, {
          Id_Objeto: lote.Id_Objeto,
          cantidad: qMer,
          tipo_movimiento: 'decrecimiento_manual', // conceptual: ya no retorna, se pierde
          origen_tipo: 'proyecto',
          origen_id: String(lote.id_Proyecto),
          destino_tipo: null,
          destino_id: null,
          referencia_tabla: 'PROYECTO_INVENTARIO',
          referencia_id: lote.id,
          razon: 'Merma por incidencia (estado distinto a Material recuperado / bloqueos)',
        });
      }

      // 4) Bloqueada: no cambia (sigue pendiente)
      const qConsumida = qLibre + qRec + qMer;
      if (qConsumida > 0) {
        await conn.query('UPDATE PROYECTO_INVENTARIO SET devolucion_pendiente = GREATEST(0, devolucion_pendiente - ?) WHERE id = ?', [
          qConsumida,
          lote.id,
        ]);
      }
    }

    return { processed: lotes.length };
  });
}

/** DELETE camión/inventario: retorna cantidad_actual al taller y registra movimiento. */
async function removeCamionInventarioItem(conn, { Placa, camion_inventario_id, razon = null }) {
  const itemRows = await conn.query(
    'SELECT id, Id_Objeto, cantidad_actual FROM CAMION_INVENTARIO WHERE id = ? AND Placa = ? FOR UPDATE',
    [camion_inventario_id, Placa],
  );
  if (!itemRows.length) return { notFound: true };

  const item = itemRows[0];
  const qty = Number(item.cantidad_actual || 0);

  if (qty > 0) {
    await moveCamionToTaller(conn, {
      Placa,
      Id_Objeto: item.Id_Objeto,
      cantidad: qty,
      razon: razon || 'Eliminación de ítem del inventario del camión',
      referencia_id: item.id,
    });
  }

  await conn.query('DELETE FROM CAMION_INVENTARIO WHERE id = ? AND Placa = ?', [item.id, Placa]);
  return { deleted: true, cantidad_retornada: qty };
}

async function resolvePlacaFromProyectoLote(conn, lote) {
  if (lote.id_proyecto_camion) {
    const pc = await conn.query('SELECT Placa FROM PROYECTO_CAMION WHERE id = ?', [lote.id_proyecto_camion]);
    if (pc[0]?.Placa) return pc[0].Placa;
  }
  if (lote.metodo_traslado) {
    const m = String(lote.metodo_traslado).match(/^camion:\s*(.+)$/i);
    if (m) return m[1].trim();
  }
  return null;
}

/** DELETE proyecto/inventario: revierte devolucion_pendiente (a camión o taller) y registra movimiento. */
async function removeProyectoInventarioLote(conn, { id_Proyecto, id_proyecto_inventario, razon = null }) {
  const rows = await conn.query(
    `SELECT id, Id_Objeto, devolucion_pendiente, id_proyecto_camion, metodo_traslado
     FROM PROYECTO_INVENTARIO WHERE id = ? AND id_Proyecto = ? FOR UPDATE`,
    [id_proyecto_inventario, id_Proyecto],
  );
  if (!rows.length) return { notFound: true };

  const lote = rows[0];
  const qty = Number(lote.devolucion_pendiente || 0);

  if (qty > 0) {
    const placa = await resolvePlacaFromProyectoLote(conn, lote);

    if (placa) {
      await ensureCamionInventarioRow(conn, placa, lote.Id_Objeto);
      await conn.query(
        'UPDATE CAMION_INVENTARIO SET cantidad_actual = cantidad_actual + ? WHERE Placa = ? AND Id_Objeto = ?',
        [qty, placa, lote.Id_Objeto],
      );
      await createMovimiento(conn, {
        Id_Objeto: lote.Id_Objeto,
        cantidad: qty,
        tipo_movimiento: 'retorno_proyecto_a_camion',
        origen_tipo: 'proyecto',
        origen_id: String(id_Proyecto),
        destino_tipo: 'camion',
        destino_id: placa,
        referencia_tabla: 'PROYECTO_INVENTARIO',
        referencia_id: lote.id,
        razon: razon || 'Eliminación de lote en proyecto (retorno a camión)',
      });
    } else {
      await addToInventarioCantidad(conn, lote.Id_Objeto, qty);
      await createMovimiento(conn, {
        Id_Objeto: lote.Id_Objeto,
        cantidad: qty,
        tipo_movimiento: 'retorno_proyecto_a_taller',
        origen_tipo: 'proyecto',
        origen_id: String(id_Proyecto),
        destino_tipo: 'taller',
        referencia_tabla: 'PROYECTO_INVENTARIO',
        referencia_id: lote.id,
        razon: razon || 'Eliminación de lote en proyecto (retorno a taller)',
      });
    }
  }

  await conn.query('DELETE FROM PROYECTO_INVENTARIO WHERE id = ?', [lote.id]);
  return { deleted: true, cantidad_retornada: qty };
}

async function processProyectoInventarioRetornoById(db, id_proyecto_inventario) {
  return withTx(db, async (conn) => {
    const lotes = await conn.query(
      `SELECT
         PI.id,
         PI.id_Proyecto,
         PI.Id_Objeto,
         PI.devolucion_pendiente,
         PI.id_proyecto_camion,
         P.estado as proyecto_estado,
         PI.fecha_devolucion_efectiva
       FROM PROYECTO_INVENTARIO PI
       JOIN PROYECTO P ON P.id_Proyecto = PI.id_Proyecto
       WHERE PI.id = ?
       FOR UPDATE`,
      [id_proyecto_inventario],
    );
    if (!lotes.length) return { processed: 0 };

    // Reusar la misma lógica procesando una sola fila forzando criterios:
    // solo si hay pendiente y (fecha <= now o proyecto completado)
    const lote = lotes[0];
    const should =
      (Number(lote.devolucion_pendiente || 0) > 0) &&
      (
        (lote.fecha_devolucion_efectiva && new Date(lote.fecha_devolucion_efectiva) <= new Date()) ||
        lote.proyecto_estado === 'Completado'
      );
    if (!should) return { processed: 0 };

    // Ejecutar la misma mecánica llamando al procesador global pero con el lote ya bloqueado:
    // (implementación directa: copiar el bloque interno que opera sobre "lote")
    const qPend = lote.devolucion_pendiente;
    if (!qPend || qPend <= 0) return { processed: 0 };

    const inc = await conn.query(
      `SELECT IO.cantidad, INC.estado
       FROM INCIDENCIA_OBJETOS IO
       JOIN INCIDENCIA INC ON INC.id_incidencia = IO.id_incidencia
       WHERE IO.id_proyecto_inventario = ?`,
      [lote.id],
    );

    const bloqueaEstados = new Set(['Sin enviar', 'Cotizacion sin respuesta', 'Cotizacion disputada']);
    let qBloqueada = 0;
    let qRecuperada = 0;
    let qMerma = 0;
    let qIncTotal = 0;

    for (const r of inc) {
      const c = Math.max(0, Number(r.cantidad || 0));
      qIncTotal += c;
      if (r.estado === 'Material recuperado') qRecuperada += c;
      else if (bloqueaEstados.has(r.estado)) qBloqueada += c;
      else qMerma += c;
    }

    const qAfectada = Math.min(qPend, qIncTotal);
    const qLibre = Math.max(0, qPend - qAfectada);
    const scale = qIncTotal > 0 ? qAfectada / qIncTotal : 0;
    const qBloq = Math.min(qAfectada, Math.round(qBloqueada * scale));
    const qRec = Math.min(qAfectada - qBloq, Math.round(qRecuperada * scale));
    const qMer = Math.max(0, qAfectada - qBloq - qRec);

    if (qLibre > 0) {
      if (lote.id_proyecto_camion) {
        const pc = await conn.query('SELECT Placa FROM PROYECTO_CAMION WHERE id = ?', [lote.id_proyecto_camion]);
        const placa = pc[0]?.Placa;
        if (placa) {
          await ensureCamionInventarioRow(conn, placa, lote.Id_Objeto);
          await conn.query(
            'UPDATE CAMION_INVENTARIO SET cantidad_actual = cantidad_actual + ? WHERE Placa = ? AND Id_Objeto = ?',
            [qLibre, placa, lote.Id_Objeto],
          );
          await createMovimiento(conn, {
            Id_Objeto: lote.Id_Objeto,
            cantidad: qLibre,
            tipo_movimiento: 'retorno_proyecto_a_camion',
            origen_tipo: 'proyecto',
            origen_id: String(lote.id_Proyecto),
            destino_tipo: 'camion',
            destino_id: placa,
            referencia_tabla: 'PROYECTO_INVENTARIO',
            referencia_id: lote.id,
            razon: 'Retorno automático (libre de incidencia)',
          });
        } else {
          await addToInventarioCantidad(conn, lote.Id_Objeto, qLibre);
          await createMovimiento(conn, {
            Id_Objeto: lote.Id_Objeto,
            cantidad: qLibre,
            tipo_movimiento: 'retorno_proyecto_a_taller',
            origen_tipo: 'proyecto',
            origen_id: String(lote.id_Proyecto),
            destino_tipo: 'taller',
            referencia_tabla: 'PROYECTO_INVENTARIO',
            referencia_id: lote.id,
            razon: 'Retorno automático (sin camión asociado)',
          });
        }
      } else {
        await addToInventarioCantidad(conn, lote.Id_Objeto, qLibre);
        await createMovimiento(conn, {
          Id_Objeto: lote.Id_Objeto,
          cantidad: qLibre,
          tipo_movimiento: 'retorno_proyecto_a_taller',
          origen_tipo: 'proyecto',
          origen_id: String(lote.id_Proyecto),
          destino_tipo: 'taller',
          referencia_tabla: 'PROYECTO_INVENTARIO',
          referencia_id: lote.id,
          razon: 'Retorno automático (sin incidencia)',
        });
      }
    }

    if (qRec > 0) {
      if (lote.id_proyecto_camion) {
        const pc = await conn.query('SELECT Placa FROM PROYECTO_CAMION WHERE id = ?', [lote.id_proyecto_camion]);
        const placa = pc[0]?.Placa;
        if (placa) {
          await ensureCamionInventarioRow(conn, placa, lote.Id_Objeto);
          await conn.query(
            'UPDATE CAMION_INVENTARIO SET cantidad_actual = cantidad_actual + ? WHERE Placa = ? AND Id_Objeto = ?',
            [qRec, placa, lote.Id_Objeto],
          );
          await createMovimiento(conn, {
            Id_Objeto: lote.Id_Objeto,
            cantidad: qRec,
            tipo_movimiento: 'retorno_proyecto_a_camion',
            origen_tipo: 'proyecto',
            origen_id: String(lote.id_Proyecto),
            destino_tipo: 'camion',
            destino_id: placa,
            referencia_tabla: 'PROYECTO_INVENTARIO',
            referencia_id: lote.id,
            razon: 'Retorno automático (Material recuperado)',
          });
        } else {
          await addToInventarioCantidad(conn, lote.Id_Objeto, qRec);
          await createMovimiento(conn, {
            Id_Objeto: lote.Id_Objeto,
            cantidad: qRec,
            tipo_movimiento: 'retorno_proyecto_a_taller',
            origen_tipo: 'proyecto',
            origen_id: String(lote.id_Proyecto),
            destino_tipo: 'taller',
            referencia_tabla: 'PROYECTO_INVENTARIO',
            referencia_id: lote.id,
            razon: 'Retorno automático (Material recuperado, sin camión asociado)',
          });
        }
      } else {
        await addToInventarioCantidad(conn, lote.Id_Objeto, qRec);
        await createMovimiento(conn, {
          Id_Objeto: lote.Id_Objeto,
          cantidad: qRec,
          tipo_movimiento: 'retorno_proyecto_a_taller',
          origen_tipo: 'proyecto',
          origen_id: String(lote.id_Proyecto),
          destino_tipo: 'taller',
          referencia_tabla: 'PROYECTO_INVENTARIO',
          referencia_id: lote.id,
          razon: 'Retorno automático (Material recuperado)',
        });
      }
    }

    if (qMer > 0) {
      await addToMermaPerdida(conn, lote.Id_Objeto, qMer);
      await createMovimiento(conn, {
        Id_Objeto: lote.Id_Objeto,
        cantidad: qMer,
        tipo_movimiento: 'decrecimiento_manual',
        origen_tipo: 'proyecto',
        origen_id: String(lote.id_Proyecto),
        destino_tipo: null,
        destino_id: null,
        referencia_tabla: 'PROYECTO_INVENTARIO',
        referencia_id: lote.id,
        razon: 'Merma por incidencia (estado distinto a Material recuperado / bloqueos)',
      });
    }

    const qConsumida = qLibre + qRec + qMer;
    if (qConsumida > 0) {
      await conn.query('UPDATE PROYECTO_INVENTARIO SET devolucion_pendiente = GREATEST(0, devolucion_pendiente - ?) WHERE id = ?', [
        qConsumida,
        lote.id,
      ]);
    }

    return { processed: 1 };
  });
}

module.exports = {
  withTx,
  getInventarioCantidad,
  updateInventarioCantidad,
  addToInventarioCantidad,
  addToMermaPerdida,
  ensureCamionInventarioRow,
  moveTallerToCamion,
  moveCamionToTaller,
  moveCamionToTallerAll,
  restoreCamionFromTaller,
  createProyectoInventarioLoteDesdeCamion,
  createProyectoInventarioLoteDesdeTaller,
  processProyectoInventarioRetornos,
  processProyectoInventarioRetornoById,
  removeCamionInventarioItem,
  removeProyectoInventarioLote,
};

