const path = require('path')
global.__basedir = path.join(__dirname, '..');
const app = require('./app');
require('dotenv').config();
const http = require('http');
const { Server } = require('socket.io');
const chatSocket = require('./sockets/chat.socket');
const db = require('./config/db');
const { processProyectoInventarioRetornos } = require('./services/inventarioStock.service');

const PORT = process.env.PORT || 3000;

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

// Iniciar sockets
app.set('socketio', io);
chatSocket(io);

server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Swagger UI available at http://localhost:${PORT}/api-docs`);

    // Job interno: procesar retornos automáticos por fecha/proyecto completado
    const intervalMs = Number(process.env.INVENTARIO_JOB_INTERVAL_MS || 60_000);
    setInterval(async () => {
        try {
            await processProyectoInventarioRetornos(db);
        } catch (e) {
            console.error('Error procesando retornos automáticos de inventario:', e.message);
        }
    }, intervalMs);
});
