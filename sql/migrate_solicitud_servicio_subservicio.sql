-- Vincula un servicio secundario de la solicitud con su entrada en SERVICIO_SUBSERVICIO
-- (permite distinguir subservicios duplicados y conservar ubicación en etapa).

ALTER TABLE `SOLICITUD_SERVICIO`
  ADD COLUMN `id_servicio_subservicio` int DEFAULT NULL
    AFTER `indicaciones`,
  ADD KEY `idx_solicitud_svc_subservicio` (`id_servicio_subservicio`),
  ADD CONSTRAINT `SOLICITUD_SERVICIO_ibfk_subservicio`
    FOREIGN KEY (`id_servicio_subservicio`) REFERENCES `SERVICIO_SUBSERVICIO` (`id`)
    ON DELETE SET NULL ON UPDATE RESTRICT;

ALTER TABLE `COTIZACION_SERVICIO`
  ADD COLUMN `id_servicio_subservicio` int DEFAULT NULL
    AFTER `indicaciones`,
  ADD KEY `idx_cotizacion_svc_subservicio` (`id_servicio_subservicio`),
  ADD CONSTRAINT `COTIZACION_SERVICIO_ibfk_subservicio`
    FOREIGN KEY (`id_servicio_subservicio`) REFERENCES `SERVICIO_SUBSERVICIO` (`id`)
    ON DELETE SET NULL ON UPDATE RESTRICT;

ALTER TABLE `PROYECTO_SERVICIO`
  ADD COLUMN `id_servicio_subservicio` int DEFAULT NULL
    AFTER `indicaciones`,
  ADD KEY `idx_proyecto_svc_subservicio` (`id_servicio_subservicio`),
  ADD CONSTRAINT `PROYECTO_SERVICIO_ibfk_subservicio`
    FOREIGN KEY (`id_servicio_subservicio`) REFERENCES `SERVICIO_SUBSERVICIO` (`id`)
    ON DELETE SET NULL ON UPDATE RESTRICT;
