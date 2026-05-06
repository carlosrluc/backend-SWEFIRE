const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : null,
    waitForConnections: true,
    connectionLimit: 10000,
});

module.exports = {
    query: async (sql, params) => {
        if (params && typeof sql === 'string' && sql.trim().toUpperCase().startsWith('UPDATE')) {
            const match = sql.match(/UPDATE\s+(.+?)\s+SET\s+(.+?)\s+(WHERE\s+.+)/is);
            if (match) {
                const table = match[1];
                const setClause = match[2];
                const whereClause = match[3];

                const setParts = setClause.split(',');
                const newSetParts = [];
                const newParams = [];
                
                let paramIndex = 0;
                for (let i = 0; i < setParts.length; i++) {
                    const qCount = (setParts[i].match(/\?/g) || []).length;
                    if (qCount === 1) {
                        const val = params[paramIndex];
                        if (val !== undefined) {
                            newSetParts.push(setParts[i].trim());
                            newParams.push(val);
                        }
                        paramIndex++;
                    } else {
                        newSetParts.push(setParts[i].trim());
                        for(let j=0; j<qCount; j++) {
                            newParams.push(params[paramIndex++]);
                        }
                    }
                }

                for (let i = paramIndex; i < params.length; i++) {
                    newParams.push(params[i]);
                }

                if (newSetParts.length === 0) {
                    return { affectedRows: 1 };
                }

                sql = `UPDATE ${table} SET ${newSetParts.join(', ')} ${whereClause}`;
                params = newParams;
            }
        }

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
