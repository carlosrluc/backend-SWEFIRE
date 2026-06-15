/** Acepta un objeto, un array, o { [clave]: [...] } */
function normalizarMatrizBody(body, claveEnvoltorio) {
    if (Array.isArray(body)) return body;
    if (body && Array.isArray(body[claveEnvoltorio])) return body[claveEnvoltorio];
    if (body && typeof body === 'object' && !Array.isArray(body)) return [body];
    return [];
}

/** Extrae YYYY-MM-DD desde string ISO, Date de mysql2 u otros valores de BD. */
function formatMysqlDatePart(value) {
    if (value === undefined || value === null || value === '') return null;
    if (value instanceof Date) {
        if (Number.isNaN(value.getTime())) return null;
        const pad = (n) => String(n).padStart(2, '0');
        return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
    }
    const s = String(value).trim();
    const iso = s.match(/^(\d{4}-\d{2}-\d{2})/);
    if (iso) return iso[1];
    const parsed = new Date(s);
    if (!Number.isNaN(parsed.getTime())) {
        const pad = (n) => String(n).padStart(2, '0');
        return `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())}`;
    }
    return null;
}

function toDateOnly(value) {
    return formatMysqlDatePart(value);
}

/** DATETIME MySQL/MariaDB: YYYY-MM-DD HH:mm:ss */
function toDateTimeInicio(value) {
    const datePart = formatMysqlDatePart(value);
    if (!datePart) return null;
    return `${datePart} 00:00:00`;
}

const { resolveJornadaFromItem, formatJornadaSchedule } = require('../utils/jornada.utils');

function toDateTimeFin(value) {
    const datePart = formatMysqlDatePart(value);
    if (!datePart) return null;
    return `${datePart} 23:59:59`;
}

function normalizeInventoryItem(item) {
    const intencion = item.intencion;
    const diasRaw = item.dias_alquilados ?? item.diasAlquilados;
    const hasServiceId = item.serviceId !== undefined && item.serviceId !== null && item.serviceId !== '';
    return {
        id: item.id ?? item.Id_Objeto ?? item.ID_Inventario,
        nombre: item.nombre ?? item.nombre_objeto ?? null,
        cantidad: Number(item.cantidad) || 0,
        precio_unitario: Number(item.precio_unitario ?? item.precioUnitario ?? item.precio_comercial ?? 0),
        intencion,
        dias_alquilados: intencion === 'alquilar'
            ? (diasRaw !== undefined && diasRaw !== null && diasRaw !== '' ? Number(diasRaw) : null)
            : null,
        servicio_a_alquilar: item.servicio_a_alquilar ?? item.idCotizacionServicio ?? item.id_cotizacion_servicio ?? item.uso ?? null,
        serviceIndex: item.serviceIndex ?? item.service_index ?? null,
        ID_Servicio: item.ID_Servicio ?? item.idServicio ?? (hasServiceId ? Number(item.serviceId) : null),
        id_servicio_subservicio: item.id_servicio_subservicio ?? item.id_subservicio ?? null,
        Principal: item.Principal ?? item.principal ?? null,
        observaciones: item.observaciones ?? null,
        fecha_salida_taller: item.fecha_salida_taller ?? item.fechaSalidaTaller ?? null,
        fecha_ingreso_taller: item.fecha_ingreso_taller ?? item.fechaIngresoTaller ?? null,
        costo_comercial: item.costo_comercial ?? item.Costo_Comercial ?? item.costoComercial ?? null,
        _itemIndex: item._itemIndex ?? item._truckIndex ?? null,
    };
}

function inventoryItemToServicioLookup(item, index = 0) {
    return {
        Placa: String(item.id ?? index),
        uso: item.servicio_a_alquilar,
        serviceIndex: item.serviceIndex,
        ID_Servicio: item.ID_Servicio,
        id_servicio_subservicio: item.id_servicio_subservicio,
        Principal: item.Principal,
        _truckIndex: item._itemIndex ?? index,
    };
}

function calcularCostoComercialAlquiler(precioUnitario, dias) {
    return Number(((Number(precioUnitario) || 0) * (Number(dias) || 0)).toFixed(2));
}

function calcularPrecioLineaInventario(item) {
    const cantidad = Number(item.cantidad) || 0;
    const precio = Number(item.precio_unitario) || 0;
    if (item.intencion === 'alquilar') {
        const dias = Number(item.dias_alquilados) || 0;
        const costo = Number(item.costo_comercial ?? item.Costo_Comercial)
            || calcularCostoComercialAlquiler(precio, dias);
        return costo * cantidad;
    }
    return precio * cantidad;
}

function normalizeServiceItem(item) {
    const idServicio = item.ID_Servicio ?? item.idServicio ?? item.id;
    const jornada = resolveJornadaFromItem(item);
    return {
        ID_Servicio: idServicio !== undefined && idServicio !== null ? Number(idServicio) : null,
        fecha_inicio: toDateOnly(item.fecha_inicio ?? item.startDate),
        fecha_finalizacion: toDateOnly(item.fecha_finalizacion ?? item.dueDate ?? item.endDate),
        jornada_comienzo: jornada.jornada_comienzo,
        jornada_final: jornada.jornada_final,
        precio_comercial: item.precio_comercial ?? item.unitPrice ?? item.precioComercial ?? null,
        Principal: item.Principal,
        indicaciones: item.indicaciones ?? null,
        id_servicio_subservicio: item.id_servicio_subservicio ?? item.id_subservicio ?? null,
        _name: item.name ?? item.nombre ?? item.nombre_servicio ?? null,
    };
}

function normalizeTruckItem(item, index = 0) {
    const hasServiceId = item.serviceId !== undefined && item.serviceId !== null && item.serviceId !== '';
    return {
        Placa: item.Placa ?? item.placa ?? item.plate,
        // id de COTIZACION_SERVICIO (solo existe tras crear la cotización o en PUT)
        uso: item.uso ?? item.idCotizacionServicio ?? item.id_cotizacion_servicio ?? null,
        // índice en services[] / servicios[] del mismo POST (recomendado al crear)
        serviceIndex: item.serviceIndex ?? item.service_index ?? null,
        // ID_Servicio del catálogo SERVICIO (alternativa al índice en el POST)
        ID_Servicio: item.ID_Servicio ?? item.idServicio ?? (hasServiceId ? Number(item.serviceId) : null),
        id_servicio_subservicio: item.id_servicio_subservicio ?? item.id_subservicio ?? null,
        Principal: item.Principal ?? item.principal ?? null,
        PrecioUnit: item.PrecioUnit ?? item.precioUnit ?? item.unitPrice ?? item.preciounit ?? 0,
        model: item.model ?? item.modelo ?? null,
        color: item.color ?? null,
        maintenanceDate: toDateOnly(item.maintenanceDate ?? item.fecha_prox_revision ?? item.fechaProximaRevision),
        description: item.description ?? item.caracteristicas ?? item.descripcion ?? null,
        _truckIndex: index,
    };
}

/**
 * Vincula un camión con una fila de COTIZACION_SERVICIO recién insertada (aún sin PK conocido en el cliente).
 * Prioridad: id COTIZACION_SERVICIO → serviceIndex → ID_Servicio (+ subservicio/Principal) → uso como índice legacy.
 */
function resolverServicioCotizacionParaCamion(truck, truckIndex, serviciosInsertados, { toPrincipalEnum } = {}) {
    if (!Array.isArray(serviciosInsertados) || !serviciosInsertados.length) return null;

    const idx = truck._truckIndex ?? truckIndex ?? 0;
    const placa = truck.Placa ?? truck.placa ?? truck.plate ?? `#${idx}`;

    const matchPrincipal = (list, principal) => {
        if (principal === undefined || principal === null || principal === '' || !toPrincipalEnum) return list;
        const target = toPrincipalEnum(principal);
        return list.filter((s) => toPrincipalEnum(s.Principal) === target);
    };

    const usoExplicit = truck.uso;
    if (usoExplicit !== undefined && usoExplicit !== null && usoExplicit !== '') {
        const byCsId = serviciosInsertados.find((s) => Number(s.id) === Number(usoExplicit));
        if (byCsId) return byCsId;
    }

    const serviceIndex = truck.serviceIndex;
    if (serviceIndex !== undefined && serviceIndex !== null && serviceIndex !== '') {
        const i = Number(serviceIndex);
        if (!Number.isNaN(i) && serviciosInsertados[i]) return serviciosInsertados[i];
    }

    const idServicio = truck.ID_Servicio;
    if (idServicio !== undefined && idServicio !== null && idServicio !== '') {
        const sid = Number(idServicio);
        let candidates = serviciosInsertados.filter((s) => Number(s.ID_Servicio) === sid);
        const idSub = truck.id_servicio_subservicio;
        if (idSub !== undefined && idSub !== null && idSub !== '') {
            candidates = candidates.filter((s) => Number(s.id_servicio_subservicio) === Number(idSub));
        }
        candidates = matchPrincipal(candidates, truck.Principal);
        if (candidates.length === 1) return candidates[0];
        if (candidates.length > 1) {
            throw new Error(
                `Camión ${placa}: ID_Servicio ${sid} es ambiguo; indique serviceIndex, id_servicio_subservicio o Principal`,
            );
        }
    }

    if (usoExplicit !== undefined && usoExplicit !== null && usoExplicit !== '') {
        const n = Number(usoExplicit);
        if (!Number.isNaN(n) && Number.isInteger(n) && serviciosInsertados[n]) {
            return serviciosInsertados[n];
        }
        const bySvcId = serviciosInsertados.filter((s) => Number(s.ID_Servicio) === n);
        const narrowed = matchPrincipal(bySvcId, truck.Principal);
        if (narrowed.length === 1) return narrowed[0];
    }

    if (serviciosInsertados[idx]) return serviciosInsertados[idx];
    return null;
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

function resolveFechaInicioProyecto(body = {}) {
    return toDateOnly(
        body.fecha_inicio_proyecto
        ?? body.fechaInicioProyecto
        ?? body.projectStartDate
        ?? body.fecha_inicio
        ?? null,
    );
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

/** Siempre string JSON válido (o null) antes de guardar en columna JSON de MariaDB. */
function serializeEtapasDetalleForDb(value) {
    if (value === undefined || value === null || value === '') return null;
    if (typeof value === 'string') {
        const trimmed = value.trim();
        if (!trimmed) return null;
        try {
            return JSON.stringify(JSON.parse(trimmed));
        } catch (_) {
            return null;
        }
    }
    if (typeof value === 'object') {
        try {
            return JSON.stringify(value);
        } catch (_) {
            return null;
        }
    }
    return null;
}

/** Serializa body.phases / { items: [...] } para etapas_detalle. */
function serializePhasesBodyForDb(phases) {
    if (phases === undefined || phases === null) return null;
    const payload = phases.items !== undefined
        ? phases
        : (Array.isArray(phases) ? { items: phases } : { items: [] });
    return serializeEtapasDetalleForDb(payload);
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
        etapas_detalle: serializeEtapasDetalleForDb(phasesPayload),
        phases: phasesPayload,
    };
}

function parseCotizacionServiciosFromBody(body = {}) {
    if (body.servicio_principal || body.servicios_secundarios) {
        const items = [];
        if (body.servicio_principal) {
            items.push({ ...body.servicio_principal, Principal: true });
        }
        if (Array.isArray(body.servicios_secundarios)) {
            for (const sec of body.servicios_secundarios) {
                items.push({ ...sec, Principal: false });
            }
        }
        return items.map(normalizeServiceItem);
    }

    const servicesRaw = body.services ?? body.servicios;
    if (servicesRaw === undefined) return undefined;
    return normalizarMatrizBody(servicesRaw, 'services').map(normalizeServiceItem);
}

/**
 * Normaliza body UpsertQuotationDTO (frontend) y formato legacy al mismo shape interno.
 * No elimina campos legacy del body original; devuelve solo lo normalizado.
 */
function normalizeCotizacionPayload(body = {}) {
    const inventoryRaw = body.inventory ?? body.productos;
    const trucksRaw = body.trucks ?? body.camiones;

    const productos = inventoryRaw !== undefined
        ? normalizarMatrizBody(inventoryRaw, 'inventory').map(normalizeInventoryItem)
        : undefined;

    const servicios = parseCotizacionServiciosFromBody(body);

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
        fecha_inicio_proyecto: resolveFechaInicioProyecto(body),
    };
}

function calcularPrecioTotal({ productos, servicios, camiones, costoRecojo }) {
    let precioTotal = 0;
    if (Array.isArray(productos)) {
        precioTotal += productos.reduce(
            (sum, p) => sum + calcularPrecioLineaInventario(p),
            0,
        );
    }
    if (Array.isArray(servicios)) {
        precioTotal += servicios.reduce(
            (sum, s) => sum + Number((s.precio_linea ?? s.precio_comercial) || 0),
            0,
        );
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

function mapCotizacionServicioRow(row) {
    const principalRaw = row.Principal;
    const Principal = principalRaw === 'YES' || principalRaw === true;
    const jornadaComienzo = row.jornada_comienzo ?? null;
    const jornadaFinal = row.jornada_final ?? null;
    return {
        idCotizacionServicio: row.idCotizacionServicio ?? row.id ?? null,
        idServicio: row.idServicio ?? row.ID_Servicio ?? null,
        nombre: row.nombre ?? row.nombre_servicio ?? row.name ?? row._name ?? null,
        fecha_inicio: row.fecha_inicio ?? null,
        fecha_finalizacion: row.fecha_finalizacion ?? null,
        jornada_comienzo: jornadaComienzo,
        jornada_final: jornadaFinal,
        jornada: formatJornadaSchedule(jornadaComienzo, jornadaFinal),
        precio_comercial: row.precio_comercial ?? null,
        Principal,
        indicaciones: row.indicaciones ?? null,
        id_servicio_subservicio: row.id_servicio_subservicio ?? row.id_subservicio ?? null,
        pago_por_dia: row.pago_por_dia === 'YES' || row.pago_por_dia === true,
        dias: row.dias ?? null,
        precio_linea: row.precio_linea ?? null,
    };
}

function splitServiciosPrincipalSecundarios(servicios) {
    const principal = servicios.find((s) => s.Principal === true);
    const secundarios = servicios.filter((s) => !s.Principal);
    return {
        servicio_principal: principal ?? null,
        servicios_secundarios: secundarios,
    };
}

function mapCotizacionServicioToUpsertService(row) {
    const mapped = mapCotizacionServicioRow(row);
    return {
        id: String(mapped.idServicio ?? ''),
        idCotizacionServicio: mapped.idCotizacionServicio,
        name: mapped.nombre ?? undefined,
        startDate: toDateOnly(mapped.fecha_inicio),
        dueDate: toDateOnly(mapped.fecha_finalizacion),
        scheduleStart: mapped.jornada_comienzo ? String(mapped.jornada_comienzo).slice(0, 8) : null,
        scheduleEnd: mapped.jornada_final ? String(mapped.jornada_final).slice(0, 8) : null,
        schedule: mapped.jornada ?? '',
        jornada_comienzo: mapped.jornada_comienzo,
        jornada_final: mapped.jornada_final,
        unitPrice: Number(mapped.precio_comercial ?? 0),
        Principal: mapped.Principal,
        indicaciones: mapped.indicaciones,
        id_servicio_subservicio: mapped.id_servicio_subservicio,
        pago_por_dia: mapped.pago_por_dia,
        dias: mapped.dias,
        precio_linea: mapped.precio_linea,
    };
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
        servicio_a_alquilar: row.servicio_a_alquilar ?? row.idCotizacionServicio ?? null,
        idCotizacionServicio: row.servicio_a_alquilar ?? row.idCotizacionServicio ?? null,
        costo_comercial: row.Costo_Comercial ?? row.costo_comercial ?? null,
        fecha_salida_taller: row.fecha_salida_taller ?? row.fechaSalidaTaller ?? null,
        fecha_ingreso_taller: row.fecha_ingreso_taller ?? row.fechaIngresoTaller ?? null,
        precio_linea: calcularPrecioLineaInventario({
            cantidad: row.cantidad,
            precio_unitario: row.precio_unitario ?? row.precioUnitario ?? row.precio_comercial,
            intencion: row.intencion,
            dias_alquilados: row.dias_alquilados ?? row.diasAlquilados,
            costo_comercial: row.Costo_Comercial ?? row.costo_comercial,
        }),
    }));

    const services = serviciosRows.map((row) => mapCotizacionServicioToUpsertService(row));

    const trucks = camionesRows.map((row) => ({
        plate: row.placa ?? row.plate ?? row.Placa ?? '',
        model: row.modelo ?? row.model ?? '',
        color: row.color ?? '',
        maintenanceDate: toDateOnly(row.fechaProximaRevision ?? row.maintenanceDate ?? row.fecha_prox_revision),
        description: row.caracteristicas ?? row.description ?? '',
        // Para PUT: id de COTIZACION_SERVICIO (ya existe tras el POST)
        uso: row.uso ?? row.idCotizacionServicio ?? null,
        idCotizacionServicio: row.uso ?? row.idCotizacionServicio ?? null,
        unitPrice: Number(row.precioUnit ?? row.PrecioUnit ?? row.unitPrice ?? 0),
        fechaEntrada: row.fechaEntrada ?? row.fecha_hora_entrada ?? null,
        fechaSalida: row.fechaSalida ?? row.fecha_hora_salida ?? null,
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
    inventoryItemToServicioLookup,
    calcularCostoComercialAlquiler,
    calcularPrecioLineaInventario,
    normalizeServiceItem,
    normalizeTruckItem,
    resolverServicioCotizacionParaCamion,
    normalizeCotizacionPayload,
    calcularPrecioTotal,
    buildUpsertQuotationResponse,
    parsePhasesFromRow,
    parseCotizacionServiciosFromBody,
    mapCotizacionServicioRow,
    mapCotizacionServicioToUpsertService,
    splitServiciosPrincipalSecundarios,
    resolveFechaInicioProyecto,
    toDateOnly,
    formatMysqlDatePart,
    toDateTimeInicio,
    toDateTimeFin,
    serializeEtapasDetalleForDb,
    serializePhasesBodyForDb,
};
