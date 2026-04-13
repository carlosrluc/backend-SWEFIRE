const db     = require('../config/db');
const bcrypt = require('bcrypt');

const SALT_ROUNDS = 12; // factor de coste: cuanto mayor, más seguro (y más lento)

// ── GET /api/usuarios ──────────────────────────────────────────────────────────
// Nunca devuelve la contraseña (ni el hash)
exports.getAll = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;

        const rows = await db.query(
            'SELECT idusuario, dni_perfil, rol, correo FROM USUARIO LIMIT ? OFFSET ?',
            [limit, offset]
        );

        const countResult = await db.query('SELECT COUNT(*) as total FROM USUARIO');
        const total = countResult[0].total;

        res.json({
            data: rows,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

// ── GET /api/usuarios/:id ──────────────────────────────────────────────────────
exports.getById = async (req, res) => {
    try {
        const rows = await db.query(
            'SELECT idusuario, dni_perfil, rol, correo FROM USUARIO WHERE idusuario = ?',
            [req.params.id]
        );
        if (!rows.length) return res.status(404).json({ error: 'No encontrado' });
        res.json(rows[0]);
    } catch (e) { res.status(500).json({ error: e.message }); }
};

// ── POST /api/usuarios ─────────────────────────────────────────────────────────
// Crea un usuario. Si el perfil (DNI) no existe, lo crea automáticamente.
exports.create = async (req, res) => {
    const { dni_perfil, rol, contrasena, correo, nombre, apellido } = req.body;
    
    if (!dni_perfil) return res.status(400).json({ error: 'El dni_perfil es requerido' });
    if (!contrasena) return res.status(400).json({ error: 'La contraseña es requerida' });
    
    try {
        // 1. Asegurar que el perfil exista (se crea con 'Pendiente' si no existe)
        await db.query(
            'INSERT IGNORE INTO PERFIL (DNI, Nombre, Apellido) VALUES (?, ?, ?)',
            [dni_perfil, nombre || 'Pendiente', apellido || 'Pendiente']
        );

        // 2. Hashear contraseña y crear usuario
        const hash = await bcrypt.hash(contrasena, SALT_ROUNDS);
        const result = await db.query(
            'INSERT INTO USUARIO (dni_perfil, rol, contrasena, correo) VALUES (?, ?, ?, ?)',
            [dni_perfil, rol, hash, correo]
        );
        
        res.status(201).json({ 
            message: 'Usuario creado y perfil verificado/creado', 
            idusuario: result.insertId 
        });
    } catch (e) { 
        res.status(500).json({ error: e.message }); 
    }
};

// ── PUT /api/usuarios/:id ──────────────────────────────────────────────────────
// Si se envía una nueva contraseña, se re-hashea; si no se envía, se conserva la actual
exports.update = async (req, res) => {
    const { dni_perfil, rol, contrasena, correo } = req.body;
    try {
        let hash = undefined;
        if (contrasena) {
            hash = await bcrypt.hash(contrasena, SALT_ROUNDS);
        }

        // Construir query dinámicamente para no sobrescribir el hash si no se envía contraseña
        const fields = [];
        const values = [];

        if (dni_perfil !== undefined) { fields.push('dni_perfil = ?'); values.push(dni_perfil); }
        if (rol        !== undefined) { fields.push('rol = ?');        values.push(rol); }
        if (hash       !== undefined) { fields.push('contrasena = ?'); values.push(hash); }
        if (correo     !== undefined) { fields.push('correo = ?');     values.push(correo); }

        if (fields.length === 0) {
            return res.status(400).json({ error: 'No se enviaron campos para actualizar' });
        }

        values.push(req.params.id);
        const result = await db.query(
            `UPDATE USUARIO SET ${fields.join(', ')} WHERE idusuario = ?`,
            values
        );
        if (result.affectedRows === 0) return res.status(404).json({ error: 'No encontrado' });
        res.json({ message: 'Usuario actualizado' });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

// ── DELETE /api/usuarios/:id ───────────────────────────────────────────────────
exports.remove = async (req, res) => {
    try {
        const result = await db.query('DELETE FROM USUARIO WHERE idusuario = ?', [req.params.id]);
        if (result.affectedRows === 0) return res.status(404).json({ error: 'No encontrado' });
        res.json({ message: 'Usuario eliminado' });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

// ── POST /api/usuarios/login ───────────────────────────────────────────────────
// Verifica correo + contraseña. Devuelve datos del usuario si son correctos.
exports.login = async (req, res) => {
    const { correo, contrasena } = req.body;
    if (!correo || !contrasena) {
        return res.status(400).json({ error: 'correo y contraseña son requeridos' });
    }
    try {
        const rows = await db.query(
            'SELECT idusuario, dni_perfil, rol, correo, contrasena FROM USUARIO WHERE correo = ?',
            [correo]
        );
        if (!rows.length) return res.status(401).json({ error: 'Credenciales inválidas' });

        const usuario = rows[0];
        const esValida = await bcrypt.compare(contrasena, usuario.contrasena);
        if (!esValida) return res.status(401).json({ error: 'Credenciales inválidas' });

        // No devolver el hash en la respuesta
        const { contrasena: _, ...usuarioSinHash } = usuario;
        res.json({ message: 'Login exitoso', usuario: usuarioSinHash });
    } catch (e) { res.status(500).json({ error: e.message }); }
};
