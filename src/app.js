const express = require('express');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
const path = require('path');
require('dotenv').config();

// ── Rutas ─────────────────────────────────────────────────────────────────────
const healthRoutes = require('./routes/health');
const perfilRoutes = require('./routes/perfil');
const usuarioRoutes = require('./routes/usuario');
const clienteRoutes = require('./routes/cliente');
const fabricanteRoutes = require('./routes/fabricante');
const inventarioRoutes = require('./routes/inventario');
const camionRoutes = require('./routes/camion');
const servicioRoutes = require('./routes/servicio');
const solicitudRoutes = require('./routes/solicitud');
const cotizacionRoutes = require('./routes/cotizacion');
const presupuestoRoutes = require('./routes/presupuesto');
const proyectoRoutes = require('./routes/proyecto');
const trabajoRoutes = require('./routes/trabajo');
const incidenciaRoutes = require('./routes/incidencia');

const app = express();

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Archivos estáticos (uploads y public) ──────────────────────────────────────
// Sirve todos los archivos subidos (PDFs, imágenes) como rutas públicas.
// Lo que se guarda en la BD es una URL relativa tipo /uploads/pdfs/archivo.pdf
// y cualquier cliente puede descargarla desde el mismo host del servidor.
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));
app.use('/public', express.static(path.join(__dirname, '..', 'public')));

// Fotos de SERVICIO.foto — públicas bajo /api/uploads/servicios/ (sin Bearer).
// La BD guarda rutas tipo /uploads/servicios/foto_xxx.png; el frontend suele anteponer /api.
app.use(
    '/api/uploads/servicios',
    express.static(path.join(__dirname, '..', 'uploads', 'servicios')),
);

// ── Swagger ───────────────────────────────────────────────────────────────────
const swaggerOptions = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'SWEFIRE API',
            version: '1.0.0',
            description:
                'API REST completa para el proyecto SWEFIRE. ' +
                'Permite gestionar (CRUD) todas las tablas de la base de datos MariaDB: ' +
                'Perfiles, Usuarios, Clientes, Fabricantes, Inventario, Camiones, ' +
                'Servicios (incl. inventario requerido por servicio), Solicitudes, Cotizaciones, Presupuestos, Proyectos, Trabajos e Incidencias.',
        },
        servers: [
            {
                url: process.env.RENDER_EXTERNAL_URL || `http://localhost:${process.env.PORT || 3000}`,
                description: process.env.RENDER_EXTERNAL_URL ? 'Servidor de Producción' : 'Servidor Local'
            },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'oauth2',
                    flows: {
                        password: {
                            tokenUrl: '/api/usuarios/login',
                            scopes: {}
                        }
                    }
                }
            },
            parameters: {
                PageQuery: {
                    in: 'query',
                    name: 'page',
                    schema: { type: 'integer', default: 1 },
                    description: 'Número de página',
                },
                LimitQuery: {
                    in: 'query',
                    name: 'limit',
                    schema: { type: 'integer', default: 10 },
                    description: 'Cantidad de resultados por página',
                },
                CotizacionEstadoQuery: {
                    in: 'query',
                    name: 'estado',
                    schema: { type: 'string' },
                    description:
                        'Filtra por estado exacto en BD (ej. Pendiente, No aprobado, aprobado, Incidencia Pagada, rechazado por cliente, descartada)',
                },
                CotizacionAprobadoQuery: {
                    in: 'query',
                    name: 'aprobado',
                    schema: { type: 'string', enum: ['YES', 'NO'] },
                    description: 'Filtra por aprobación interna. Cliente siempre recibe solo YES.',
                },
                CotizacionDeIncidenciaQuery: {
                    in: 'query',
                    name: 'cotizacion_de_incidencia',
                    schema: { type: 'string', enum: ['YES', 'NO'] },
                    description: 'YES = solo cotizaciones ligadas a incidencia (Id_incidencia). Abogado las ve por defecto.',
                },
                CotizacionNombreQuery: {
                    in: 'query',
                    name: 'nombre',
                    schema: { type: 'string' },
                    description: 'Filtra por nombre de la cotización (coincidencia parcial)',
                },
            },
        },
        security: [{
            bearerAuth: []
        }],
    },
    apis: [path.join(__dirname, 'routes', '*.js')],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customJs: '/public/swagger-custom.js'
}));

const authMiddleware = require('./middlewares/auth.middleware');

/** Rutas públicas bajo /api (sin Bearer). Solo registro y login de usuario. */
const PUBLIC_API_ROUTES = [
    { method: 'POST', path: '/usuarios/login' },
    { method: 'POST', path: '/usuarios' },
    { method: 'POST', path: '/usuarios/con-perfil' },
    { method: 'GET', path: '/servicios/publicos' },
];

function isPublicApiRoute(req) {
    const path = req.path.endsWith('/') && req.path.length > 1
        ? req.path.slice(0, -1)
        : req.path;
    if (PUBLIC_API_ROUTES.some((r) => r.method === req.method && r.path === path)) {
        return true;
    }
    // Fotografías de SERVICIO.foto — acceso sin Bearer (retroactivo vía redirect a /uploads/servicios/...)
    if (req.method === 'GET' && /^\/servicios\/\d+\/foto$/.test(path)) {
        return true;
    }
    // Plantilla principal del servicio (catálogo para armar solicitud)
    if (req.method === 'GET' && /^\/servicios\/\d+\/principal$/.test(path)) {
        return true;
    }
    // Archivos estáticos de SERVICIO.foto bajo /api/uploads/servicios/...
    if (req.method === 'GET' && /^\/uploads\/servicios\/.+/.test(path)) {
        return true;
    }
    return false;
}

app.use('/api', (req, res, next) => {
    if (isPublicApiRoute(req)) return next();
    return authMiddleware(req, res, next);
});

// ── API Routes ────────────────────────────────────────────────────────────────
app.use('/api/health', healthRoutes);
app.use('/api/perfiles', perfilRoutes);
app.use('/api/usuarios', usuarioRoutes);
app.use('/api/clientes', clienteRoutes);
app.use('/api/fabricantes', fabricanteRoutes);
app.use('/api/inventario', inventarioRoutes);
app.use('/api/camiones', camionRoutes);
app.use('/api/servicios', servicioRoutes);
app.use('/api/solicitudes', solicitudRoutes);
app.use('/api/cotizaciones', cotizacionRoutes);
app.use('/api/presupuestos', presupuestoRoutes);
app.use('/api/proyectos', proyectoRoutes);
app.use('/api/trabajos', trabajoRoutes);
app.use('/api/incidencias', incidenciaRoutes);
//update
// ── DB health check inline ────────────────────────────────────────────────────
const pool = require('./config/db');
app.get('/api/db-health', async (req, res) => {
    try {
        await pool.query('SELECT 1');
        res.json({ status: 'DB conectada correctamente ✅' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.use((err, req, res, next) => {
    console.error(err);
    res.status(err.status || 500).json({ error: err.message || 'Error interno' });
});

module.exports = app;
