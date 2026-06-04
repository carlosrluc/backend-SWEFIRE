const db = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'secret_key_swefire';

// Paginación y Ocultamiento de contraseñas
exports.getAll = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;

        const rows = await db.query(
            `SELECT U.idusuario, U.dni_perfil, U.rol, U.correo, P.Nombre as Perfil_Nombre, P.Apellido as Perfil_Apellido 
             FROM USUARIO U 
             LEFT JOIN PERFIL P ON U.dni_perfil = P.DNI 
             ORDER BY U.idusuario DESC
             LIMIT ? OFFSET ?`,
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

exports.getById = async (req, res) => {
    try {
        const rows = await db.query(
            `SELECT U.idusuario, U.dni_perfil, U.rol, U.correo, P.Nombre as Perfil_Nombre, P.Apellido as Perfil_Apellido 
             FROM USUARIO U 
             LEFT JOIN PERFIL P ON U.dni_perfil = P.DNI 
             WHERE U.idusuario = ?`,
            [req.params.id]
        );
        if (!rows.length) return res.status(404).json({ error: 'No encontrado' });
        res.json(rows[0]);
    } catch (e) { res.status(500).json({ error: e.message }); }
};

/** Campos de PERFIL permitidos al registrar usuario + perfil (rol cliente). */
const PERFIL_REGISTRO_KEYS = [
    'Nombre',
    'Apellido',
    'correo_contacto',
    'telefono_contacto',
    'distrito_residencia',
    'profesion',
];

function extraerPerfilRegistro(body) {
    const raw = body.perfil || body.cliente;
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
    const perfil = {};
    if (raw.Nombre !== undefined) perfil.Nombre = raw.Nombre;
    if (raw.Apellido !== undefined) perfil.Apellido = raw.Apellido;
    if (raw.correo_contacto !== undefined) perfil.correo_contacto = raw.correo_contacto;
    if (raw.telefono_contacto !== undefined) perfil.telefono_contacto = raw.telefono_contacto;
    const distrito = raw.distrito_residencia ?? raw.distrito_recidencia;
    if (distrito !== undefined) perfil.distrito_residencia = distrito;
    if (raw.profesion !== undefined) perfil.profesion = raw.profesion;
    return perfil;
}

exports.create = async (req, res) => {
    const { dni_perfil, rol, contrasena, correo } = req.body;
    try {
        if (!dni_perfil || !correo) {
            return res.status(400).json({ error: 'dni_perfil y correo son requeridos' });
        }
        if (!contrasena) {
            return res.status(400).json({ error: 'La contraseña es requerida' });
        }

        const perfilExistente = await db.query('SELECT DNI FROM PERFIL WHERE DNI = ?', [dni_perfil]);
        if (!perfilExistente.length) {
            return res.status(400).json({
                error: 'No existe un perfil con ese DNI. Cree el perfil primero o use POST /api/usuarios/con-perfil',
            });
        }

        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(contrasena, saltRounds);

        const result = await db.query(
            'INSERT INTO USUARIO (dni_perfil,rol,contrasena,correo,temp_pass_unhashed) VALUES (?,?,?,?,?)',
            [dni_perfil, rol, hashedPassword, correo, contrasena]
        );
        res.status(201).json({ message: 'Usuario creado', idusuario: result.insertId });
    } catch (e) {
        if (e.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ error: 'Ya existe un usuario con ese correo o DNI' });
        }
        res.status(500).json({ error: e.message });
    }
};

/** Crea PERFIL (campos limitados) y USUARIO en una transacción. */
exports.createWithPerfil = async (req, res) => {
    const { dni_perfil, rol, contrasena, correo } = req.body;
    const perfil = extraerPerfilRegistro(req.body);

    try {
        if (!dni_perfil || !correo) {
            return res.status(400).json({ error: 'dni_perfil y correo son requeridos' });
        }
        if (!contrasena) {
            return res.status(400).json({ error: 'La contraseña es requerida' });
        }
        if (!perfil) {
            return res.status(400).json({
                error: 'Se requiere el objeto perfil (o cliente) con los datos del perfil',
                campos_permitidos: PERFIL_REGISTRO_KEYS,
            });
        }
        if (!perfil.Nombre || !perfil.Apellido) {
            return res.status(400).json({ error: 'perfil.Nombre y perfil.Apellido son requeridos' });
        }

        const rawPerfil = req.body.perfil || req.body.cliente;
        const allowedPerfilKeys = new Set([...PERFIL_REGISTRO_KEYS, 'distrito_recidencia']);
        const extraKeys = Object.keys(rawPerfil).filter((k) => !allowedPerfilKeys.has(k));
        if (extraKeys.length) {
            return res.status(400).json({
                error: `Campos no permitidos en perfil: ${extraKeys.join(', ')}`,
                campos_permitidos: PERFIL_REGISTRO_KEYS,
            });
        }

        const existente = await db.query('SELECT DNI FROM PERFIL WHERE DNI = ?', [dni_perfil]);
        if (existente.length) {
            return res.status(409).json({ error: 'Ya existe un perfil con ese DNI' });
        }

        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(contrasena, saltRounds);

        const conn = await db.getConnection();
        try {
            await conn.beginTransaction();

            await conn.query(
                `INSERT INTO PERFIL (DNI, Nombre, Apellido, correo_contacto, telefono_contacto, distrito_residencia, profesion)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [
                    dni_perfil,
                    perfil.Nombre,
                    perfil.Apellido,
                    perfil.correo_contacto ?? null,
                    perfil.telefono_contacto ?? null,
                    perfil.distrito_residencia ?? null,
                    perfil.profesion ?? null,
                ]
            );

            const [userResult] = await conn.query(
                'INSERT INTO USUARIO (dni_perfil, rol, contrasena, correo, temp_pass_unhashed) VALUES (?, ?, ?, ?, ?)',
                [dni_perfil, rol, hashedPassword, correo, contrasena]
            );

            await conn.commit();

            res.status(201).json({
                message: 'Usuario y perfil creados',
                idusuario: userResult.insertId,
                dni_perfil,
                perfil: {
                    DNI: dni_perfil,
                    ...perfil,
                },
            });
        } catch (txErr) {
            await conn.rollback();
            throw txErr;
        } finally {
            conn.release();
        }
    } catch (e) {
        if (e.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ error: 'Ya existe un usuario con ese correo' });
        }

        res.status(500).json({ error: e.message });
    }
};

exports.update = async (req, res) => {
    const { dni_perfil, rol, contrasena, correo } = req.body;
    try {
        let result;
        if (contrasena) {
            const saltRounds = 12;
            const hashedPassword = await bcrypt.hash(contrasena, saltRounds);
            result = await db.query(
                'UPDATE USUARIO SET dni_perfil=?,rol=?,contrasena=?,correo=? WHERE idusuario=?',
                [dni_perfil, rol, hashedPassword, correo, req.params.id]
            );
        } else {
            result = await db.query(
                'UPDATE USUARIO SET dni_perfil=?,rol=?,correo=? WHERE idusuario=?',
                [dni_perfil, rol, correo, req.params.id]
            );
        }
        
        if (result.affectedRows === 0) return res.status(404).json({ error: 'No encontrado' });
        res.json({ message: 'Usuario actualizado' });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.remove = async (req, res) => {
    try {
        const result = await db.query('DELETE FROM USUARIO WHERE idusuario = ?', [req.params.id]);
        if (result.affectedRows === 0) return res.status(404).json({ error: 'No encontrado' });
        res.json({ message: 'Usuario eliminado' });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.login = async (req, res) => {
    const correo = req.body.correo || req.body.username;
    const contrasena = req.body.contrasena || req.body.password;
    try {
        const rows = await db.query('SELECT * FROM USUARIO WHERE correo = ?', [correo]);
        if (!rows.length) return res.status(401).json({ error: 'Credenciales inválidas' });

        const user = rows[0];
        
        let match = false;
        // Check text password for backwards compatibility, otherwise bcrypt
        if (user.contrasena && !user.contrasena.startsWith('$2')) {
            match = (user.contrasena === contrasena);
        } else {
            match = await bcrypt.compare(contrasena, user.contrasena);
        }
        
        if (!match) return res.status(401).json({ error: 'Credenciales inválidas' });

        const token = jwt.sign(
            { idusuario: user.idusuario, dni_perfil: user.dni_perfil, rol: user.rol, correo: user.correo },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        const perfilRows = await db.query('SELECT Nombre, Apellido FROM PERFIL WHERE DNI = ?', [user.dni_perfil]);
        const perfilNombre = perfilRows.length > 0 ? perfilRows[0].Nombre : null;
        const perfilApellidos = perfilRows.length > 0 ? perfilRows[0].Apellido : null;

        const checkRows = await db.query(`
            SELECT 1 
            FROM CLIENTE_CONTACTO cc
            JOIN SOLICITUD s ON cc.DNI_O_RUC = s.Id_Cliente
            WHERE cc.DNI_perfil = ?
            LIMIT 1
        `, [user.dni_perfil]);
        const nuevo = checkRows.length > 0 ? 'no' : 'si';

        const { contrasena: unneeded, temp_pass_unhashed: tempUnneeded, ...userData } = user;
        res.json({ 
            message: 'Login exitoso', 
            token, 
            access_token: token, 
            user: userData,
            nombre: perfilNombre,
            apellidos: perfilApellidos,
            nuevo: nuevo
        });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.getTempPassword = async (req, res) => {
    try {
        const rows = await db.query('SELECT temp_pass_unhashed FROM USUARIO WHERE correo = ?', [req.params.correo]);
        if (!rows.length) return res.status(404).json({ error: 'Usuario no encontrado' });
        res.json({ correo: req.params.correo, password: rows[0].temp_pass_unhashed });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};
