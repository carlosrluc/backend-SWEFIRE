const fs = require('fs');
const path = require('path');

const controllersDir = path.join(__dirname, 'src/controllers');
const files = fs.readdirSync(controllersDir).filter(f => f.endsWith('.js'));

files.forEach(file => {
    // Skip cotizacion and usuario as they have specific RBAC/auth implementations
    if (file === 'cotizacion.controller.js' || file === 'usuario.controller.js') return;

    const fp = path.join(controllersDir, file);
    let content = fs.readFileSync(fp, 'utf8');

    // Mapeo simple de nombre de archivo a tabla
    const tableMap = {
        'camion.controller.js': 'CAMION',
        'cliente.controller.js': 'CLIENTE',
        'fabricante.controller.js': 'FABRICANTE',
        'inventario.controller.js': 'INVENTARIO',
        'perfil.controller.js': 'PERFIL',
        'presupuesto.controller.js': 'PRESUPUESTO_INTERNO',
        'proyecto.controller.js': 'PROYECTO',
        'servicio.controller.js': 'SERVICIO',
        'solicitud.controller.js': 'SOLICITUD',
        'trabajo.controller.js': 'TRABAJO'
    };

    const tableName = tableMap[file];
    if (!tableName) return;

    // Pattern for `exports.getAll = async ...`
    const regex1 = new RegExp(`exports\\.getAll = async \\(req, res\\) => \\{\\s+try \\{ res\\.json\\(await db\\.query\\('SELECT \\* FROM ${tableName}'\\)\\); \\}\\s+catch \\(e\\) \\{ res\\.status\\(500\\)\\.json\\(\\{ error: e\\.message \\}\\); \\}\\s+\\};`);

    const regex2 = new RegExp(`exports\\.getAll = async \\(req, res\\) => \\{\\s+try \\{\\s+const rows = await db\\.query\\('SELECT \\* FROM ${tableName}'\\);\\s+res\\.json\\(rows\\);\\s+\\} catch \\(e\\) \\{ res\\.status\\(500\\)\\.json\\(\\{ error: e\\.message \\}\\); \\}\\s+\\};`);

    const replacement = `exports.getAll = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;

        const rows = await db.query(
            'SELECT * FROM ${tableName} LIMIT ? OFFSET ?',
            [limit, offset]
        );

        const countResult = await db.query('SELECT COUNT(*) as total FROM ${tableName}');
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
};`;

    if (regex1.test(content)) {
        content = content.replace(regex1, replacement);
        fs.writeFileSync(fp, content);
        console.log(`Updated ${file}`);
    } else if (regex2.test(content)) {
        content = content.replace(regex2, replacement);
        fs.writeFileSync(fp, content);
        console.log(`Updated ${file}`);
    } else {
        console.log(`Could not pattern match in ${file}`);
    }
});
