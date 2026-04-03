const express = require('express');
const router = express.Router();
const db = require('../config/db');

/**
 * @openapi
 * /api/health:
 *   get:
 *     description: Returns the health status of the API and database
 *     responses:
 *       200:
 *         description: Successfully returns health check
 */
router.get('/', async (req, res) => {
    let dbStatus = 'Disconnected';
    let conn;
    try {
        conn = await db.getConnection();
        dbStatus = 'Connected';
    } catch (err) {
        dbStatus = 'Error connecting to database';
    } finally {
        if (conn) conn.release();
    }

    res.json({
        status: 'UP',
        database: dbStatus,
        timestamp: new Date().toISOString()
    });
});

module.exports = router;
