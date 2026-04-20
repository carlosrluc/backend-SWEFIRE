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
                'Servicios, Solicitudes, Cotizaciones, Presupuestos, Proyectos, Trabajos e Incidencias.',
        },
        servers: [
            {
                url: process.env.RENDER_EXTERNAL_URL || `http://localhost:${process.env.PORT || 3000}`,
                description: process.env.RENDER_EXTERNAL_URL ? 'Servidor de Producción' : 'Servidor Local'
            },
        ],
    },
    apis: [path.join(__dirname, 'routes', '*.js')],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

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

module.exports = app;
