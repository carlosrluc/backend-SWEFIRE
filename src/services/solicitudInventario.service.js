const INTENCIONES_VALIDAS = new Set(['comprar', 'alquilar']);

/**
 * Acepta inventario[] o productos[] (alias usado al importar a cotización).
 */
function parseInventarioInput(body) {
    if (!body || typeof body !== 'object') return [];
    if (Array.isArray(body.inventario)) return body.inventario;
    if (Array.isArray(body.productos)) return body.productos;
    if (body.ID_Inventario != null || body.id != null || body.Id_Objeto != null) return [body];
    return [];
}

function normalizeInventarioItem(item) {
    const intencion = item.intencion ?? null;
    const diasRaw = item.dias_alquilados ?? item.diasAlquilados;
    return {
        ID_Inventario: item.ID_Inventario ?? item.id ?? item.Id_Objeto ?? null,
        cantidad: item.cantidad != null ? Number(item.cantidad) : null,
        intencion,
        dias_alquilados: intencion === 'alquilar'
            ? (diasRaw != null && diasRaw !== '' ? Number(diasRaw) : null)
            : (diasRaw != null && diasRaw !== '' ? Number(diasRaw) : 0),
    };
}

function httpError(statusCode, message) {
    const err = new Error(message);
    err.statusCode = statusCode;
    return err;
}

async function validarInventarioItems(executor, items) {
    for (const item of items) {
        if (!item.ID_Inventario) {
            throw httpError(400, 'Cada ítem de inventario debe incluir ID_Inventario (o id / Id_Objeto)');
        }
        if (!item.cantidad || item.cantidad <= 0) {
            throw httpError(400, `Cantidad inválida para inventario ${item.ID_Inventario}`);
        }
        if (!INTENCIONES_VALIDAS.has(item.intencion)) {
            throw httpError(400, `intencion inválida para inventario ${item.ID_Inventario}. Use comprar o alquilar`);
        }
        if (item.intencion === 'alquilar' && (!item.dias_alquilados || item.dias_alquilados <= 0)) {
            throw httpError(400, `dias_alquilados es requerido y debe ser > 0 cuando intencion es alquilar (inventario ${item.ID_Inventario})`);
        }

        const rows = await executor.query(
            'SELECT Id_Objeto, nombre_objeto FROM INVENTARIO WHERE Id_Objeto = ?',
            [item.ID_Inventario],
        );
        if (!rows.length) {
            throw httpError(400, `Inventario Id_Objeto ${item.ID_Inventario} no existe en catálogo`);
        }
    }
}

async function insertarInventarioSolicitud(executor, idSolicitud, rawItems) {
    const items = rawItems.map(normalizeInventarioItem);
    if (!items.length) return [];

    await validarInventarioItems(executor, items);

    const insertados = [];
    for (const item of items) {
        const dias = item.intencion === 'alquilar' ? item.dias_alquilados : 0;
        const result = await executor.query(
            `INSERT INTO SOLICITUD_INVENTARIO
                (ID_Solicitud, ID_Inventario, cantidad, intencion, dias_alquilados)
             VALUES (?,?,?,?,?)`,
            [idSolicitud, item.ID_Inventario, item.cantidad, item.intencion, dias],
        );
        insertados.push({
            id: result.insertId,
            ID_Solicitud: Number(idSolicitud),
            ...item,
            dias_alquilados: dias,
        });
    }
    return insertados;
}

async function listarInventarioSolicitud(executor, idSolicitud) {
    return executor.query(
        `SELECT SI.*, I.nombre_objeto AS nombre, I.precio_comercial AS precio_unitario
         FROM SOLICITUD_INVENTARIO SI
         LEFT JOIN INVENTARIO I ON SI.ID_Inventario = I.Id_Objeto
         WHERE SI.ID_Solicitud = ?
         ORDER BY SI.id ASC`,
        [idSolicitud],
    );
}

module.exports = {
    parseInventarioInput,
    normalizeInventarioItem,
    insertarInventarioSolicitud,
    listarInventarioSolicitud,
};
