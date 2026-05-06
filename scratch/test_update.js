const sql = `UPDATE PROYECTO SET descripcion_servicio=?,ID_Trabajo=?,Id_Cliente=?,ubicacion=?,id_cotizacion=?,
             orden_servicio=?,informe_final=?,factura=?,fecha_inicio=?,fecha_fin=?,observaciones=?,estado=?
             WHERE id_Proyecto=?`;
const params = [undefined, 1, undefined, 'Lima', null, undefined, undefined, undefined, '2025-05-01', undefined, undefined, 'En Ejecución', 5];

const match = sql.match(/UPDATE\s+(.+?)\s+SET\s+(.+?)\s+(WHERE\s+.+)/is);
if (match) {
    const table = match[1];
    const setClause = match[2];
    const whereClause = match[3];

    // Splitting by comma is safe if there are no commas inside function calls, which is true here.
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

    // Add the remaining params (from WHERE clause)
    for (let i = paramIndex; i < params.length; i++) {
        newParams.push(params[i]);
    }

    const newSql = `UPDATE ${table} SET ${newSetParts.join(', ')} ${whereClause}`;
    console.log(newSql);
    console.log(newParams);
}
