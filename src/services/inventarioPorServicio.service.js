const { getInventarioCantidad } = require('./inventarioStock.service');

function mapFilasToItems(filas) {
    const mapa = new Map();
    for (const row of filas) {
        const estancia = row.estancia || 'para inventario';
        const key = `${row.Id_Objeto}|${estancia}`;
        if (!mapa.has(key)) {
            mapa.set(key, {
                id_inventario: row.Id_Objeto,
                nombre_objeto: row.nombre_objeto,
                estancia,
                cantidad_requerida: 0,
                cantidad_en_inventario: Number(row.cantidad_en_inventario || 0),
                precio_compra: Number(row.precio_compra || 0),
                servicios: [],
                _serviciosSet: new Set(),
            });
        }
        const item = mapa.get(key);
        item.cantidad_requerida += Number(row.cantidad_por_servicio || 0);
        if (!item._serviciosSet.has(row.nombre_servicio)) {
            item._serviciosSet.add(row.nombre_servicio);
            item.servicios.push(row.nombre_servicio);
        }
    }

    return Array.from(mapa.values())
        .map((item) => {
            const esParaInventario = item.estancia === 'para inventario';
            const faltante = esParaInventario
                ? Math.max(0, item.cantidad_requerida - item.cantidad_en_inventario)
                : 0;
            const costo = faltante > 0 ? faltante * item.precio_compra : 0;
            return {
                id_inventario: item.id_inventario,
                nombre_objeto: item.nombre_objeto,
                estancia: item.estancia,
                cantidad_requerida: item.cantidad_requerida,
                cantidad_en_inventario: item.cantidad_en_inventario,
                precio_compra: item.precio_compra,
                servicios: item.servicios,
                faltante,
                costo: Math.round(costo * 100) / 100,
            };
        })
        .sort((a, b) => b.id_inventario - a.id_inventario);
}

async function aggregateInventarioPorProyecto(executor, idProyecto) {
    const proyectoRows = await executor.query(
        'SELECT id_Proyecto, id_cotizacion, Proyecto_Nombre, fecha_inicio, fecha_fin FROM PROYECTO WHERE id_Proyecto = ?',
        [idProyecto],
    );
    if (!proyectoRows.length) return { proyecto: null, items: [], servicios: [] };

    const proyecto = proyectoRows[0];
    if (!proyecto.id_cotizacion) {
        return { proyecto, items: [], servicios: [] };
    }

    const filas = await executor.query(
        `SELECT
            i.Id_Objeto,
            i.nombre_objeto,
            i.cantidad AS cantidad_en_inventario,
            i.precio_compra,
            sir.cantidad AS cantidad_por_servicio,
            sir.estancia,
            s.nombre AS nombre_servicio
         FROM PROYECTO p
         INNER JOIN COTIZACION_SERVICIO cs ON cs.ID_Cotizacion = p.id_cotizacion
         INNER JOIN SERVICIO s ON s.ID_Servicio = cs.ID_Servicio
         INNER JOIN SERVICIO_INVENTARIO_REQUERIDO sir ON sir.ID_Servicio = s.ID_Servicio
         INNER JOIN INVENTARIO i ON i.Id_Objeto = sir.Id_Objeto
         WHERE p.id_Proyecto = ?
         ORDER BY i.Id_Objeto DESC`,
        [idProyecto],
    );

    const servicios = await executor.query(
        `SELECT DISTINCT s.ID_Servicio, s.nombre
         FROM PROYECTO p
         INNER JOIN COTIZACION_SERVICIO cs ON cs.ID_Cotizacion = p.id_cotizacion
         INNER JOIN SERVICIO s ON s.ID_Servicio = cs.ID_Servicio
         WHERE p.id_Proyecto = ?
         ORDER BY s.ID_Servicio DESC`,
        [idProyecto],
    );

    return { proyecto, items: mapFilasToItems(filas), servicios };
}

async function aggregateInventarioPorCotizacion(executor, idCotizacion) {
    const cotRows = await executor.query(
        "SELECT ID FROM COTIZACION_COMERCIAL WHERE ID = ? AND desactualizado = 'NO'",
        [idCotizacion],
    );
    if (!cotRows.length) return { cotizacion: null, items: [], servicios: [] };

    const filas = await executor.query(
        `SELECT
            i.Id_Objeto,
            i.nombre_objeto,
            i.cantidad AS cantidad_en_inventario,
            i.precio_compra,
            sir.cantidad AS cantidad_por_servicio,
            sir.estancia,
            s.nombre AS nombre_servicio
         FROM COTIZACION_SERVICIO cs
         INNER JOIN SERVICIO s ON s.ID_Servicio = cs.ID_Servicio
         INNER JOIN SERVICIO_INVENTARIO_REQUERIDO sir ON sir.ID_Servicio = s.ID_Servicio
         INNER JOIN INVENTARIO i ON i.Id_Objeto = sir.Id_Objeto
         WHERE cs.ID_Cotizacion = ?
         ORDER BY i.Id_Objeto DESC`,
        [idCotizacion],
    );

    const servicios = await executor.query(
        `SELECT DISTINCT s.ID_Servicio, s.nombre
         FROM COTIZACION_SERVICIO cs
         INNER JOIN SERVICIO s ON s.ID_Servicio = cs.ID_Servicio
         WHERE cs.ID_Cotizacion = ?
         ORDER BY s.ID_Servicio DESC`,
        [idCotizacion],
    );

    return {
        cotizacion: { ID: idCotizacion },
        items: mapFilasToItems(filas),
        servicios,
    };
}

/**
 * Combina requerimientos de SERVICIO_INVENTARIO_REQUERIDO y COTIZACION_INVENTARIO,
 * y calcula el faltante de stock en taller por objeto.
 */
async function aggregateFaltantesInventarioCotizacion(executor, idCotizacion) {
    const { items: servicioItems } = await aggregateInventarioPorCotizacion(executor, idCotizacion);

    const cotizacionInventarioRows = await executor.query(
        `SELECT ci.ID_Inventario, ci.cantidad, i.nombre_objeto, i.precio_compra
         FROM COTIZACION_INVENTARIO ci
         INNER JOIN INVENTARIO i ON i.Id_Objeto = ci.ID_Inventario
         WHERE ci.ID_Cotizacion = ?`,
        [idCotizacion],
    );

    const requeridoPorId = new Map();

    for (const item of servicioItems) {
        if (item.estancia !== 'para inventario') continue;
        const id = item.id_inventario;
        const prev = requeridoPorId.get(id) ?? {
            id_inventario: id,
            nombre_objeto: item.nombre_objeto,
            precio_compra: item.precio_compra,
            cantidad_requerida: 0,
        };
        prev.cantidad_requerida += item.cantidad_requerida;
        requeridoPorId.set(id, prev);
    }

    for (const row of cotizacionInventarioRows) {
        const id = row.ID_Inventario;
        const cantidad = Number(row.cantidad) || 0;
        if (cantidad <= 0) continue;
        const prev = requeridoPorId.get(id) ?? {
            id_inventario: id,
            nombre_objeto: row.nombre_objeto,
            precio_compra: Number(row.precio_compra) || 0,
            cantidad_requerida: 0,
        };
        prev.cantidad_requerida += cantidad;
        if (!prev.nombre_objeto) prev.nombre_objeto = row.nombre_objeto;
        if (!prev.precio_compra) prev.precio_compra = Number(row.precio_compra) || 0;
        requeridoPorId.set(id, prev);
    }

    const faltantes = [];

    for (const item of requeridoPorId.values()) {
        const stock = await getInventarioCantidad(executor, item.id_inventario);
        const faltante = Math.max(0, item.cantidad_requerida - stock);
        if (faltante <= 0) continue;
        faltantes.push({
            id_inventario: item.id_inventario,
            nombre_objeto: item.nombre_objeto,
            cantidad_requerida: item.cantidad_requerida,
            cantidad_en_inventario: stock,
            precio_compra: item.precio_compra,
            faltante,
            costo: Math.round(faltante * item.precio_compra * 100) / 100,
        });
    }

    return faltantes.sort((a, b) => b.id_inventario - a.id_inventario);
}

module.exports = {
    aggregateInventarioPorProyecto,
    aggregateInventarioPorCotizacion,
    aggregateFaltantesInventarioCotizacion,
};
