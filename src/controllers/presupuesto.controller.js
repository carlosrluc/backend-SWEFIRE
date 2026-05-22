const db = require('../config/db');

// Obtener todos los items del presupuesto de una cotización (con filtro opcional por tipo)
exports.getByCotizacion = async (req, res) => {
    try {
        const idCotizacion = req.params.id;
        const tipo = req.query.tipo;
        
        let query = 'SELECT ID, ID_Cotizacion, tipo, nombre_gasto, costo_unitario, cantidad, costo_total, moneda, costo_x_hora, hora_total, dias_trabajados, estancia FROM PRESUPUESTO WHERE ID_Cotizacion = ?';
        const params = [idCotizacion];
        
        if (tipo) {
            query += ' AND tipo = ?';
            params.push(tipo);
        }
        
        const rows = await db.query(query, params);
        
        // Filtrar campos nulos para no enviarlos
        const cleanedRows = rows.map(row => {
            const cleanRow = {};
            for (const key in row) {
                if (row[key] !== null) {
                    cleanRow[key] = row[key];
                }
            }
            return cleanRow;
        });
        
        res.json(cleanedRows);
    } catch (e) { res.status(500).json({ error: e.message }); }
};

// Obtener todos los items del presupuesto de una cotización (incluyendo gastos reales y diferencias)
exports.getByCotizacionReal = async (req, res) => {
    try {
        const idCotizacion = req.params.id;
        const tipo = req.query.tipo;
        
        let query = 'SELECT * FROM PRESUPUESTO WHERE ID_Cotizacion = ?';
        const params = [idCotizacion];
        
        if (tipo) {
            query += ' AND tipo = ?';
            params.push(tipo);
        }
        
        const rows = await db.query(query, params);
        
        // Filtrar campos nulos para no enviarlos
        const cleanedRows = rows.map(row => {
            const cleanRow = {};
            for (const key in row) {
                if (row[key] !== null) {
                    cleanRow[key] = row[key];
                }
            }
            return cleanRow;
        });
        
        res.json(cleanedRows);
    } catch (e) { res.status(500).json({ error: e.message }); }
};

// Obtener totales globales y por tipo
exports.getTotales = async (req, res) => {
    try {
        const idCotizacion = req.params.id;
        
        const rows = await db.query('SELECT * FROM PRESUPUESTO WHERE ID_Cotizacion = ?', [idCotizacion]);
        
        const totales = {
            global: {
                costo_total_presupuestado: 0,
                costo_total_real: 0,
                diferencia_total: 0
            },
            por_tipo: {}
        };
        
        for (const row of rows) {
            const tipo = row.tipo;
            if (!totales.por_tipo[tipo]) {
                totales.por_tipo[tipo] = {
                    costo_total_presupuestado: 0,
                    costo_total_real: 0,
                    diferencia_total: 0
                };
            }
            
            const presupuestado = Number(row.costo_total) || 0;
            const real = Number(row.costo_real) || 0;
            const difBD = Number(row.diferencia) || 0;
            
            totales.global.costo_total_presupuestado += presupuestado;
            totales.global.costo_total_real += real;
            totales.global.diferencia_total += difBD;
            
            totales.por_tipo[tipo].costo_total_presupuestado += presupuestado;
            totales.por_tipo[tipo].costo_total_real += real;
            totales.por_tipo[tipo].diferencia_total += difBD;
        }
        
        res.json(totales);
    } catch (e) { res.status(500).json({ error: e.message }); }
};

// Crear un item de presupuesto
exports.createItem = async (req, res) => {
    const idCotizacion = req.params.id;
    const data = req.body; 
    
    try {
        let costo_total = 0;
        
        if (data.tipo === 'Mano de Obra') {
            const cxH = Number(data.costo_x_hora) || 0;
            const hT = Number(data.hora_total) || 0;
            const dT = Number(data.dias_trabajados) || 0;
            costo_total = cxH * hT * dT;
        } else {
            const cU = Number(data.costo_unitario) || 0;
            const cant = Number(data.cantidad) || 0;
            costo_total = (cU > 0 && cant > 0) ? (cU * cant) : (Number(data.costo_total) || 0);
        }
        
        const result = await db.query(
            `INSERT INTO PRESUPUESTO (
                ID_Cotizacion, tipo, nombre_gasto, costo_unitario, cantidad, 
                costo_total, moneda, costo_x_hora, hora_total, dias_trabajados, estancia
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                idCotizacion, data.tipo, data.nombre_gasto || null, data.costo_unitario || null, data.cantidad || null,
                costo_total, data.moneda || 'soles', data.costo_x_hora || null, data.hora_total || null, data.dias_trabajados || null, 
                data.estancia || null
            ]
        );
        
        res.status(201).json({ message: 'Item de presupuesto creado', id: result.insertId });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

// Actualizar un item presupuestado
exports.updateItem = async (req, res) => {
    const idItem = req.params.idItem;
    const data = req.body;
    
    try {
        let costo_total = 0;
        
        if (data.tipo === 'Mano de Obra') {
            const cxH = Number(data.costo_x_hora) || 0;
            const hT = Number(data.hora_total) || 0;
            const dT = Number(data.dias_trabajados) || 0;
            costo_total = cxH * hT * dT;
        } else {
            const cU = Number(data.costo_unitario) || 0;
            const cant = Number(data.cantidad) || 0;
            costo_total = (cU > 0 && cant > 0) ? (cU * cant) : (Number(data.costo_total) || 0);
        }
        
        const result = await db.query(
            `UPDATE PRESUPUESTO SET 
                tipo = ?, nombre_gasto = ?, costo_unitario = ?, cantidad = ?, 
                costo_total = ?, moneda = ?, costo_x_hora = ?, hora_total = ?, 
                dias_trabajados = ?, estancia = ?
            WHERE ID = ?`,
            [
                data.tipo, data.nombre_gasto || null, data.costo_unitario || null, data.cantidad || null,
                costo_total, data.moneda || 'soles', data.costo_x_hora || null, data.hora_total || null, 
                data.dias_trabajados || null, data.estancia || null, idItem
            ]
        );
        
        if (result.affectedRows === 0) return res.status(404).json({ error: 'Item no encontrado' });
        res.json({ message: 'Item actualizado exitosamente' });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

// Eliminar un item presupuestado
exports.deleteItem = async (req, res) => {
    const idItem = req.params.idItem;
    try {
        const result = await db.query('DELETE FROM PRESUPUESTO WHERE ID = ?', [idItem]);
        if (result.affectedRows === 0) return res.status(404).json({ error: 'Item no encontrado' });
        res.json({ message: 'Item eliminado exitosamente' });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

// Registrar Gasto Real y subir comprobante
exports.registrarGastoReal = async (req, res) => {
    const idItem = req.params.idItem;
    const { costo_real, razon } = req.body;
    let pruebaUrl = null;
    
    if (req.file) {
        pruebaUrl = `/uploads/pruebas_gastos/${req.file.filename}`; 
    }
    
    try {
        // Obtener el registro para calcular diferencia y ver si es Material Directo
        const rows = await db.query('SELECT * FROM PRESUPUESTO WHERE ID = ?', [idItem]);
        if (rows.length === 0) return res.status(404).json({ error: 'Item no encontrado' });
        
        const item = rows[0];
        
        // Calcular diferencia (Real - Presupuestado)
        const c_real = Number(costo_real) || 0;
        const c_total_presupuesto = Number(item.costo_total) || 0;
        const diferencia = c_real - c_total_presupuesto;
        
        const updateParams = [c_real, razon, diferencia];
        let queryStr = 'UPDATE PRESUPUESTO SET costo_real = ?, razon = ?, diferencia = ?, realizacion_gastos = "durante servicio"';
        
        if (pruebaUrl) {
            queryStr += ', prueba = ?';
            updateParams.push(pruebaUrl);
        }
        
        queryStr += ' WHERE ID = ?';
        updateParams.push(idItem);
        
        await db.query(queryStr, updateParams);
        
        // Si es Material Directo, insertar en INVENTARIO
        if (item.tipo === 'Material Directo') {
            await db.query(
                `INSERT INTO INVENTARIO (nombre_objeto, cantidad, precio_compra, factura, estado, lugar_almacenaje)
                 VALUES (?, ?, ?, ?, 'disponible', 'Por asignar')`,
                 [item.nombre_gasto, item.cantidad, c_real, pruebaUrl || '']
            );
        }
        
        res.json({ message: 'Gasto real registrado exitosamente', diferencia });
    } catch (e) { res.status(500).json({ error: e.message }); }
};
