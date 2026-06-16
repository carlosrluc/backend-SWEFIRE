const cotizacionController = require('./cotizacion.controller');
const {
    listDestinatariosCotizacion,
    listCotizacionesByIncidencia,
    createCotizacionIncidencia,
    getServiciosCatalogoIncidencia,
} = require('../services/cotizacionIncidencia.service');

function handleError(res, e) {
    const status = e.status || 500;
    res.status(status).json({ error: e.message });
}

exports.getDestinatariosCotizacion = async (req, res) => {
    try {
        const data = await listDestinatariosCotizacion(Number(req.params.id));
        res.json(data);
    } catch (e) { handleError(res, e); }
};

exports.getCotizacionesByIncidencia = async (req, res) => {
    try {
        const rows = await listCotizacionesByIncidencia(Number(req.params.id));
        const rol = req.user ? req.user.rolNormalizado : null;
        res.json({
            data: rows.map((r) => cotizacionController.formatQuotation(r, rol)),
        });
    } catch (e) { handleError(res, e); }
};

exports.createCotizacionIncidencia = async (req, res) => {
    try {
        const result = await createCotizacionIncidencia(Number(req.params.id), req.body);
        res.status(201).json({
            message: 'Cotización de incidencia creada',
            ...result,
            cotizacion: result,
        });
    } catch (e) { handleError(res, e); }
};

exports.getServiciosIncidencia = async (req, res) => {
    try {
        const rows = await getServiciosCatalogoIncidencia();
        res.json({ data: rows });
    } catch (e) { handleError(res, e); }
};
