const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Helpers for directories
const createDir = (dir) => {
    const fullPath = path.join(__dirname, '../../uploads', dir);
    if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true });
    }
    return fullPath;
};

const cotizacionesDir = createDir('cotizaciones');
const pdfsDir = createDir('pdfs');
const imagesDir = createDir('images');

// Generic storage creator
const createStorage = (destination, prefix) => multer.diskStorage({
    destination: (req, file, cb) => cb(null, destination),
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, `${prefix}_${uniqueSuffix}${path.extname(file.originalname)}`);
    }
});

// Filters
const pdfFilter = (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
        cb(null, true);
    } else {
        cb(new Error('Solo se permiten archivos PDF'), false);
    }
};

const imageFilter = (req, file, cb) => {
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp', 'image/gif'];
    if (allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Solo se permiten archivos de imagen (JPEG, PNG, WEBP, GIF)'), false);
    }
};

// Multer instances
const uploadCotizacion = multer({ 
    storage: createStorage(cotizacionesDir, 'orden_compra'),
    fileFilter: pdfFilter,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

const uploadPDF = multer({ 
    storage: createStorage(pdfsDir, 'doc'),
    fileFilter: pdfFilter,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

const uploadImage = multer({ 
    storage: createStorage(imagesDir, 'img'),
    fileFilter: imageFilter,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

const informesDir = createDir('informes');

const informeImageFilter = (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/jpg'];
    if (allowed.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Solo se permiten imágenes PNG o JPEG'), false);
    }
};

const uploadInformeEvidencia = multer({
    storage: createStorage(informesDir, 'evidencia'),
    fileFilter: informeImageFilter,
    limits: { fileSize: 5 * 1024 * 1024 },
});

module.exports = {
    uploadCotizacion: uploadCotizacion,
    uploadPDF: uploadPDF,
    uploadImage: uploadImage,
    uploadInformeEvidencia,
};

