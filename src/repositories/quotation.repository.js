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
        const RelativePurchaseOrderFileUrl = `/uploads/cotizaciones/${filename}`;
        await db.query(`
            UPDATE COTIZACION_COMERCIAL 
            SET Orden_compra = (?),
                orden_compra_rechazada = 'NO',
                motivo_rechazo_orden_compra = NULL
            WHERE ID = (?) AND desactualizado = 'NO'
        `, [RelativePurchaseOrderFileUrl, QuotationID]);

        return RelativePurchaseOrderFileUrl;
    },

    async rejectPurchaseOrder(quotationID, motivo) {
        const quotation = await QuotationRepository.getQuotationByID(quotationID);
        if (!quotation) return null;

        if (quotation.Orden_compra) {
            deleteFile(quotation.Orden_compra);
        }

        await db.query(`
            UPDATE COTIZACION_COMERCIAL
            SET Orden_compra = NULL,
                orden_compra_rechazada = 'YES',
                motivo_rechazo_orden_compra = ?
            WHERE ID = ? AND desactualizado = 'NO'
        `, [motivo, quotationID]);

        return QuotationRepository.getQuotationByID(quotationID);
    },
};

module.exports = QuotationRepository;