# Migración de Presupuesto Unificado

Este documento detalla los cambios realizados para consolidar las diferentes tablas de presupuesto en una sola (`PRESUPUESTO`), e incluye el SQL actualizado con los nuevos campos solicitados para la mano de obra (`costo_x_hora`, `hora_total`, `dias_trabajados`).

## Cambios Realizados

1. **Unificación de Tablas:** Se eliminaron las tablas segmentadas (`PRESUPUESTO_MANO_OBRA`, `PRESUPUESTO_MATERIAL_DIRECTO`, etc.) a favor de una única tabla `PRESUPUESTO`.
2. **Campos Específicos de Mano de Obra:** Se agregaron las columnas `costo_x_hora`, `hora_total` y `dias_trabajados`. El `costo_total` para la mano de obra será el producto de estos tres.
3. **Integración con Inventario:** La inserción de Material Directo en la tabla `INVENTARIO` ahora ocurre explícitamente cuando se registra el gasto real (es decir, se sube la prueba y se confirma la compra), evitando llenar el inventario con objetos "fantasma" que solo fueron presupuestados pero no comprados.
4. **Archivos de Prueba:** Se adaptó un middleware para permitir la subida de comprobantes en formatos PDF, PNG, JPEG y JPG al registrar el gasto real.
5. **Cálculo de Totales:** Se añadió un endpoint para obtener el total global presupuestado, el total real gastado y las diferencias.

## SQL Actualizado

Debido a que mencionaste que ya habías corrido el SQL anterior, aquí tienes el script SQL con los **nuevos atributos** de mano de obra y ajustes. Por favor, corre este script en la base de datos para reemplazar la estructura actual:

```sql
-- 1. Eliminar la tabla si ya la habías creado para volver a crearla con los nuevos campos
DROP TABLE IF EXISTS `PRESUPUESTO`;

-- 2. Crear nueva tabla unificada PRESUPUESTO
CREATE TABLE `PRESUPUESTO` (
  `ID` int NOT NULL AUTO_INCREMENT,
  `ID_Cotizacion` int NOT NULL,
  
  -- Clasificación y Estado
  `tipo` enum('Material Directo','Mano de Obra','Servicios','Gastos Administrativos','Costos Indirectos') NOT NULL,
  `realizacion_gastos` enum('anulada','en preparacion','durante servicio') DEFAULT 'en preparacion',
  
  -- Valores Estimados (Presupuestado) - Generales
  `nombre_gasto` varchar(150) DEFAULT NULL, 
  `costo_unitario` decimal(12,2) DEFAULT NULL, 
  `cantidad` decimal(10,2) DEFAULT NULL, 
  `costo_total` decimal(14,2) DEFAULT NULL,
  `moneda` enum('soles','dolares') DEFAULT 'soles',
  
  -- Atributos de Mano de Obra
  `costo_x_hora` decimal(10,2) DEFAULT NULL,
  `hora_total` decimal(10,2) DEFAULT NULL, -- Puede contener decimales para representar minutos (ej. 2.5)
  `dias_trabajados` int DEFAULT NULL,
  
  -- Atributos de Inventario (Solo Material Directo)
  `estancia` enum('para proyecto','para inventario') DEFAULT NULL,
  
  -- Comparación / Gasto Real
  `costo_real` decimal(14,2) DEFAULT NULL,
  `prueba` varchar(500) DEFAULT NULL, -- Ruta o URL del archivo
  `razon` text DEFAULT NULL,
  `diferencia` decimal(14,2) DEFAULT NULL,
  
  PRIMARY KEY (`ID`),
  KEY `ID_Cotizacion` (`ID_Cotizacion`),
  CONSTRAINT `PRESUPUESTO_ibfk_COT` FOREIGN KEY (`ID_Cotizacion`) REFERENCES `COTIZACION_COMERCIAL` (`ID`) ON DELETE CASCADE
);
```

## SQL para Poblar Datos de Prueba (Opcional)

Si deseas probar con algunos datos, asegúrate de tener una Cotización con `ID = 1` y ejecuta lo siguiente:

```sql
-- Insertar un Material Directo
INSERT INTO `PRESUPUESTO` (`ID_Cotizacion`, `tipo`, `nombre_gasto`, `costo_unitario`, `cantidad`, `costo_total`, `moneda`, `estancia`) 
VALUES (1, 'Material Directo', 'Tuberías de Acero 5"', 120.00, 10, 1200.00, 'soles', 'para proyecto');

-- Insertar una Mano de Obra
INSERT INTO `PRESUPUESTO` (`ID_Cotizacion`, `tipo`, `nombre_gasto`, `costo_x_hora`, `hora_total`, `dias_trabajados`, `costo_total`, `moneda`) 
VALUES (1, 'Mano de Obra', 'Ingeniero Residente', 50.00, 8, 20, 8000.00, 'soles');

-- Insertar un Gasto Administrativo
INSERT INTO `PRESUPUESTO` (`ID_Cotizacion`, `tipo`, `nombre_gasto`, `costo_total`, `moneda`) 
VALUES (1, 'Gastos Administrativos', 'Trámites de Licencia', 350.00, 'soles');
```
