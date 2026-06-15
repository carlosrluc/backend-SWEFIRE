-- Migración: pago por día en SERVICIO
-- Ejecutar una sola vez sobre swefire_db.

ALTER TABLE `SERVICIO`
  ADD COLUMN `pago_por_dia` enum('YES','NO') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'NO'
    AFTER `precio_regular`;
