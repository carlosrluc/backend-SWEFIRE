const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: process.env.DB_SSL,
    waitForConnections: true,
    connectionLimit: 10000,
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
