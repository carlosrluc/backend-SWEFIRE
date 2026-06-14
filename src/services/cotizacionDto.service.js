/** Acepta un objeto, un array, o { [clave]: [...] } */
function normalizarMatrizBody(body, claveEnvoltorio) {
    if (Array.isArray(body)) return body;
    if (body && Array.isArray(body[claveEnvoltorio])) return body[claveEnvoltorio];
    if (body && typeof body === 'object' && !Array.isArray(body)) return [body];
    return [];
}

function toDateOnly(value) {
    if (!value) return null;
    return String(value).slice(0, 10);
}

function normalizeInventoryItem(item) {
    const intencion = item.intencion;
    const diasRaw = item.dias_alquilados ?? item.diasAlquilados;
    return {
        id: item.id ?? item.Id_Objeto ?? item.ID_Inventario,
        nombre: item.nombre ?? item.nombre_objeto ?? null,
        cantidad: Number(item.cantidad) || 0,
        precio_unitario: Number(item.precio_unitario ?? item.precioUnitario ?? item.precio_comercial ?? 0),
        intencion,
        dias_alquilados: intencion === 'alquilar' ? (Number(diasRaw) || 0) : null,
    };
}

function normalizeServiceItem(item) {
    const idServicio = item.ID_Servicio ?? item.idServicio ?? item.id;
    return {
        ID_Servicio: idServicio !== undefined && idServicio !== null ? Number(idServicio) : null,
        fecha_inicio: toDateOnly(item.fecha_inicio ?? item.startDate),
        fecha_finalizacion: toDateOnly(item.fecha_finalizacion ?? item.dueDate ?? item.endDate),
        jornada: item.jornada ?? item.schedule ?? null,
        precio_comercial: item.precio_comercial ?? item.unitPrice ?? item.precioComercial ?? null,
        Principal: item.Principal,
        indicaciones: item.indicaciones ?? null,
        _name: item.name ?? item.nombre ?? item.nombre_servicio ?? null,
    };
}

function normalizeTruckItem(item, index = 0) {
    return {
        Placa: item.Placa ?? item.placa ?? item.plate,
        uso: item.uso ?? item.serviceIndex ?? item.serviceId ?? index,
        PrecioUnit: item.PrecioUnit ?? item.precioUnit ?? item.unitPrice ?? item.preciounit ?? 0,
        model: item.model ?? item.modelo ?? null,
        color: item.color ?? null,
        maintenanceDate: toDateOnly(item.maintenanceDate ?? item.fecha_prox_revision ?? item.fechaProximaRevision),
        description: item.description ?? item.caracteristicas ?? item.descripcion ?? null,
    };
}

function normalizePickup(body) {
    const ps = body.pickupService ?? body.costoRecojo;
    if (!ps) return undefined;
    return {
        costo: ps.costo ?? ps.pickupCost ?? null,
        fechaRecojo: toDateOnly(ps.fechaRecojo ?? ps.pickupDate),
        direccion_recojo: ps.pickupAddress ?? ps.direccionRecojo ?? ps.direccion_recojo ?? null,
    };
}

function normalizeConditions(body) {
    const c = body.quotationConditions ?? body.condiciones;
    if (!c) return undefined;
    return {
        fechaEmision: toDateOnly(c.fechaEmision ?? c.emissionDate),
        fechaVigencia: toDateOnly(c.fechaVigencia ?? c.expirationDate),
        condiciones: c.condiciones ?? c.conditions ?? null,
        observaciones: c.observaciones ?? c.observations ?? null,
    };
}

function normalizeRate(body) {
    const r = body.quotationRate ?? body.tasaCambio ?? body.tipoCambio;
    if (!r) return undefined;
    return {
        tasaCompra: r.tasaCompra ?? r.buyingRate ?? null,
        tasaVenta: r.tasaVenta ?? r.sellingRate ?? null,
    };
}

function parsePhasesRaw(raw) {
    if (raw == null) return null;
    if (typeof raw === 'string') {
        try {
            return JSON.parse(raw);
        } catch (_) {
            return null;
        }
    }
    return raw;
}

/** Acepta `phases` (UpsertQuotationDTO) o `etapas_detalle` (JSON legacy en body). */
function normalizePhases(body) {
    let raw;
    if (body.phases !== undefined) {
        raw = body.phases;
    } else if (body.etapas_detalle !== undefined) {
        raw = parsePhasesRaw(body.etapas_detalle);
    } else {
        return undefined;
    }
    if (!raw) return undefined;

    const items = raw.items ?? (Array.isArray(raw) ? raw : []);
    if (!items.length) {
        return { etapas: null, duracion_etapa: null, etapas_detalle: null };
    }

    const normalizedItems = items.map((item) => ({
        id: String(item.id ?? ''),
        name: item.name ?? item.nombre ?? '',
        description: item.description ?? item.descripcion ?? '',
        duration: Number(item.duration ?? item.duracion ?? 0),
        activities: (item.activities ?? item.actividades ?? []).map((act) => ({
            id: String(act.id ?? ''),
            name: act.name ?? act.nombre ?? '',
        })),
    }));

    const totalDuration = normalizedItems.reduce((sum, i) => sum + (Number(i.duration) || 0), 0);
    const phasesPayload = { items: normalizedItems };

    return {
        etapas: normalizedItems.length,
        duracion_etapa: String(totalDuration),
        etapas_detalle: JSON.stringify(phasesPayload),
        phases: phasesPayload,
    };
}

/**
 * Normaliza body UpsertQuotationDTO (frontend) y formato legacy al mismo shape interno.
 * No elimina campos legacy del body original; devuelve solo lo normalizado.
 */
function normalizeCotizacionPayload(body = {}) {
    const inventoryRaw = body.inventory ?? body.productos;
    const servicesRaw = body.services ?? body.servicios;
    const trucksRaw = body.trucks ?? body.camiones;

    const productos = inventoryRaw !== undefined
        ? normalizarMatrizBody(inventoryRaw, 'inventory').map(normalizeInventoryItem)
        : undefined;

    const servicios = servicesRaw !== undefined
        ? normalizarMatrizBody(servicesRaw, 'services').map(normalizeServiceItem)
        : undefined;

    const camiones = trucksRaw !== undefined
        ? normalizarMatrizBody(trucksRaw, 'trucks').map((t, i) => normalizeTruckItem(t, i))
        : undefined;

    const costoRecojo = normalizePickup(body);
    const condiciones = normalizeConditions(body);
    const tasaCambio = normalizeRate(body);
    const phasesData = (body.phases !== undefined || body.etapas_detalle !== undefined)
        ? normalizePhases(body)
        : undefined;

    return {
        nombre: body.name ?? body.nombre,
        id_solicitud: body.id_solicitud,
        DNI_O_RUC: body.DNI_O_RUC,
        version: body.version,
        estado: body.estado,
        comentario_cliente: body.comentario_cliente,
        Tasa_Cambio: body.Tasa_Cambio,
        productos,
        servicios,
        camiones,
        costoRecojo,
        condiciones,
        tasaCambio,
        etapas: phasesData?.etapas,
        duracion_etapa: phasesData?.duracion_etapa,
        etapas_detalle: phasesData?.etapas_detalle,
        phases: phasesData?.phases,
        phasesProvided: body.phases !== undefined || body.etapas_detalle !== undefined,
        direccion_recojo: costoRecojo?.direccion_recojo ?? body.direccion_recojo ?? null,
        Id_incidencia: body.Id_incidencia ?? null,
    };
}

function calcularPrecioTotal({ productos, servicios, camiones, costoRecojo }) {
    let precioTotal = 0;
    if (Array.isArray(productos)) {
        precioTotal += productos.reduce(
            (sum, p) => sum + ((Number(p.precio_unitario) || 0) * (Number(p.cantidad) || 0)),
            0,
        );
    }
    if (Array.isArray(servicios)) {
        precioTotal += servicios.reduce((sum, s) => sum + Number(s.precio_comercial || 0), 0);
    }
    if (Array.isArray(camiones)) {
        precioTotal += camiones.reduce((sum, c) => sum + Number(c.PrecioUnit ?? 0), 0);
    }
    if (costoRecojo?.costo) {
        precioTotal += Number(costoRecojo.costo);
    }
    return precioTotal;
}

function parsePhasesFromRow(base) {
    if (base?.etapas_detalle) {
        try {
            const parsed = typeof base.etapas_detalle === 'string'
                ? JSON.parse(base.etapas_detalle)
                : base.etapas_detalle;
            if (parsed?.items) return { items: parsed.items };
            if (Array.isArray(parsed)) return { items: parsed };
        } catch (_) { /* usar fallback */ }
    }
    return { items: [] };
}

function buildUpsertQuotationResponse({
    base,
    productosRows = [],
    serviciosRows = [],
    camionesRows = [],
    costoRecojo = null,
    etapasTree = null,
}) {
    const inventory = productosRows.map((row) => ({
        id: String(row.id ?? row.ID_Inventario ?? ''),
        nombre: row.nombre ?? row.nombre_objeto ?? '',
        cantidad: Number(row.cantidad) || 0,
        precio_unitario: Number(row.precio_unitario ?? row.precioUnitario ?? row.precio_comercial ?? 0),
        intencion: row.intencion,
        dias_alquilados: row.intencion === 'alquilar'
            ? (Number(row.dias_alquilados ?? row.diasAlquilados) || 0)
            : null,
    }));

    const services = serviciosRows.map((row) => ({
        id: String(row.idServicio ?? row.ID_Servicio ?? row.id ?? ''),
        name: row.nombre ?? row.nombre_servicio ?? row.name ?? undefined,
        startDate: toDateOnly(row.fecha_inicio ?? row.startDate),
        dueDate: toDateOnly(row.fecha_finalizacion ?? row.dueDate),
        schedule: row.jornada ?? row.schedule ?? '',
        unitPrice: Number(row.precio_comercial ?? row.unitPrice ?? 0),
    }));

    const trucks = camionesRows.map((row) => ({
        plate: row.placa ?? row.plate ?? row.Placa ?? '',
        model: row.modelo ?? row.model ?? '',
        color: row.color ?? '',
        maintenanceDate: toDateOnly(row.fechaProximaRevision ?? row.maintenanceDate ?? row.fecha_prox_revision),
        description: row.caracteristicas ?? row.description ?? '',
    }));

    return {
        name: base.nombre || '',
        inventory,
        services,
        trucks,
        pickupService: costoRecojo ? {
            pickupCost: Number(costoRecojo.costo ?? costoRecojo.pickupCost ?? 0),
            pickupDate: toDateOnly(costoRecojo.fechaRecojo ?? costoRecojo.pickupDate),
            pickupAddress: base.direccion_recojo ?? costoRecojo.pickupAddress ?? costoRecojo.direccion_recojo ?? '',
        } : {
            pickupCost: 0,
            pickupDate: null,
            pickupAddress: base.direccion_recojo ?? '',
        },
        quotationConditions: {
            emissionDate: toDateOnly(base.fecha_emision),
            expirationDate: toDateOnly(base.fecha_vigencia),
            conditions: base.condiciones || '',
            observations: base.observacion || '',
        },
        quotationRate: {
            sellingRate: Number(base.tasaVenta ?? 0),
            buyingRate: Number(base.tacaCompra ?? 0),
        },
        phases: etapasTree
            ? {
                items: etapasTree.map((etapa, ei) => ({
                    id: etapa.referencia || String(etapa.id ?? `etapa-${ei + 1}`),
                    id_bd: etapa.id,
                    name: etapa.nombre,
                    description: etapa.descripcion ?? '',
                    duration: Number(etapa.duracion) || 0,
                    activities: (etapa.actividades || []).map((act, ai) => ({
                        id: act.referencia || String(act.id ?? `act-${ei + 1}-${ai + 1}`),
                        id_bd: act.id,
                        name: act.nombre,
                    })),
                })),
            }
            : parsePhasesFromRow(base),
        etapas_tabla: etapasTree || undefined,
    };
}

module.exports = {
    normalizarMatrizBody,
    normalizeInventoryItem,
    normalizeServiceItem,
    normalizeTruckItem,
    normalizeCotizacionPayload,
    calcularPrecioTotal,
    buildUpsertQuotationResponse,
    parsePhasesFromRow,
    toDateOnly,
};
