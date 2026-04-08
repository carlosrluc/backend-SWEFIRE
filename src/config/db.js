const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : null
});

module.exports = {
    query: async (sql, params) => {
        const [rows] = await pool.query(sql, params);
        return rows;
    },
    getConnection: async () => {
        try {
            return await pool.getConnection();
        } catch (err) {
            console.error('Error connecting to MariaDB:', err);
            throw err;
        }
    }
};
