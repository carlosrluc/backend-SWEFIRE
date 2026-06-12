const db = require('../config/db');
const deleteFile = require('../utils/deleteFile');

const QuotationRepository = {
    async getQuotationByID(quotationID) {
        const quotationRows = await db.query(`
            SELECT * 
            FROM COTIZACION_COMERCIAL cc 
            WHERE cc.ID = (?) AND cc.desactualizado = 'NO'
        `, [quotationID])
        return quotationRows[0]
    },

    async upsertPurchaseOrderFileURL(filename, QuotationID) {
        // Guardar URL relativa en la base de datos (ej: /uploads/cotizaciones/orden_compra_xxx.pdf)
        const RelativePurchaseOrderFileUrl = `/uploads/cotizaciones/${filename}`;
        await db.query(`
            UPDATE COTIZACION_COMERCIAL 
            SET Orden_compra = (?) 
            WHERE ID = (?) AND desactualizado = 'NO'
        `, [RelativePurchaseOrderFileUrl, QuotationID]);

        return RelativePurchaseOrderFileUrl;
    }
};

module.exports = QuotationRepository;