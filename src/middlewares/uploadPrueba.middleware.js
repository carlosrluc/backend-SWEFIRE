const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Crear la carpeta si no existe (usamos la misma de cotizaciones u otra dedicada)
const uploadDir = path.join(__dirname, '../../uploads/pruebas_gastos');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, `prueba_gasto_${uniqueSuffix}${path.extname(file.originalname)}`);
    }
});

const fileFilter = (req, file, cb) => {
    // Aceptar PDFs, PNG, JPG, JPEG
    const allowedMimeTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
    if (allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Solo se permiten archivos PDF, PNG, JPG o JPEG'), false);
    }
};

const uploadPrueba = multer({ 
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB límite
    }
});

module.exports = uploadPrueba;
