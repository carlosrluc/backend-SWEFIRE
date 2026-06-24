const QuotationStatus = Object.freeze({
    APPROVED: 'aprobado',
    REJECTED_BY_CLIENT: 'rechazado por cliente',
    DISCARDED: 'descartada',
    PENDING: 'Pendiente',
    NOT_APPROVED: 'No aprobado',
    INCIDENCE_PAID: 'Incidencia Pagada',
});

const QuotationApproval = Object.freeze({
    YES: 'YES',
    NO: 'NO',
});


module.exports = {
    QuotationStatus,
    QuotationApproval,
};