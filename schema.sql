-- ============================================================
-- SWEFIRE DB - SCHEMA COMPLETO
-- ============================================================

CREATE DATABASE IF NOT EXISTS swefire_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE swefire_db;
CREATE TABLE "CLIENTE" (
  "DNI_O_RUC" varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  "nombre_comercial" varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  "razon_social" varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  "rubro" varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  "ubicacion_facturacion" varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  "observacion" text COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY ("DNI_O_RUC")
);


-- swefire_db.FABRICANTE definition

CREATE TABLE "FABRICANTE" (
  "ID_Fabricante" int NOT NULL AUTO_INCREMENT,
  "nombre_comercial" varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  "ubicacion" varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  "rubro" varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  "descripcion" text COLLATE utf8mb4_unicode_ci,
  "comentarios" text COLLATE utf8mb4_unicode_ci,
  "pago" varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY ("ID_Fabricante")
);


-- swefire_db.PERFIL definition

CREATE TABLE "PERFIL" (
  "DNI" varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  "Nombre" varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  "Apellido" varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  "Genero" varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  "RUC" varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  "fecha_nacimiento" date DEFAULT NULL,
  "correo_contacto" varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  "telefono_contacto" varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  "estado_civil" varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  "distrito_residencia" varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  "seguro_vida_ley" enum('si','no') COLLATE utf8mb4_unicode_ci DEFAULT 'no',
  "aficiones" text COLLATE utf8mb4_unicode_ci,
  "experiencia" text COLLATE utf8mb4_unicode_ci,
  "comentarios" text COLLATE utf8mb4_unicode_ci,
  "estado" enum('inhabilitado','en trabajo','disponible') COLLATE utf8mb4_unicode_ci DEFAULT 'disponible',
  "alergias" text COLLATE utf8mb4_unicode_ci,
  "condicion_medica" text COLLATE utf8mb4_unicode_ci,
  "profesion" varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  "nro_cta_bancaria" varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  "cv" varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  "foto_perfil" varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY ("DNI")
);


-- swefire_db.SERVICIO definition

CREATE TABLE "SERVICIO" (
  "ID_Servicio" int NOT NULL AUTO_INCREMENT,
  "nombre" varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  "descripcion" text COLLATE utf8mb4_unicode_ci,
  "precio_regular" decimal(12,2) DEFAULT NULL,
  "condicional_precio" text COLLATE utf8mb4_unicode_ci,
  "observaciones" text COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY ("ID_Servicio")
);


-- swefire_db.CAMION definition

CREATE TABLE "CAMION" (
  "Placa" varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  "nombre" varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  "ano_fabricacion" year DEFAULT NULL,
  "modelo" varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  "color" varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  "caracteristicas" text COLLATE utf8mb4_unicode_ci,
  "revision_tecnica" varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  "fecha_prox_revision" date DEFAULT NULL,
  "ID_Fabricante" int DEFAULT NULL,
  "tarjeta_propiedad" varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  "vencimiento_tarjeta" date DEFAULT NULL,
  "soat_n_poliza" varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  "soat_empresa" varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  "soat_precio" decimal(10,2) DEFAULT NULL,
  "soat_dia_pago" date DEFAULT NULL,
  PRIMARY KEY ("Placa"),
  KEY "ID_Fabricante" ("ID_Fabricante"),
  CONSTRAINT "CAMION_ibfk_1" FOREIGN KEY ("ID_Fabricante") REFERENCES "FABRICANTE" ("ID_Fabricante") ON DELETE SET NULL
);


-- swefire_db.CAMION_MANTENIMIENTO definition

CREATE TABLE "CAMION_MANTENIMIENTO" (
  "id" int NOT NULL AUTO_INCREMENT,
  "Placa" varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  "fecha_ultimo_mant" date DEFAULT NULL,
  "responsable" varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  "razon" text COLLATE utf8mb4_unicode_ci,
  "contacto_responsable" varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  "pdf_mantenimiento" varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY ("id"),
  KEY "Placa" ("Placa"),
  CONSTRAINT "CAMION_MANTENIMIENTO_ibfk_1" FOREIGN KEY ("Placa") REFERENCES "CAMION" ("Placa") ON DELETE CASCADE
);


-- swefire_db.CLIENTE_CONTACTO definition

CREATE TABLE "CLIENTE_CONTACTO" (
  "id" int NOT NULL AUTO_INCREMENT,
  "DNI_O_RUC" varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  "DNI_perfil" varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  "cargo_en_empresa" varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  "lugar_trabajo" varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY ("id"),
  KEY "DNI_O_RUC" ("DNI_O_RUC"),
  KEY "DNI_perfil" ("DNI_perfil"),
  CONSTRAINT "CLIENTE_CONTACTO_ibfk_1" FOREIGN KEY ("DNI_O_RUC") REFERENCES "CLIENTE" ("DNI_O_RUC") ON DELETE CASCADE,
  CONSTRAINT "CLIENTE_CONTACTO_ibfk_2" FOREIGN KEY ("DNI_perfil") REFERENCES "PERFIL" ("DNI") ON DELETE SET NULL
);


-- swefire_db.CLIENTE_CORREO definition

CREATE TABLE "CLIENTE_CORREO" (
  "id" int NOT NULL AUTO_INCREMENT,
  "DNI_O_RUC" varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  "correo" varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  "rama" varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY ("id"),
  KEY "DNI_O_RUC" ("DNI_O_RUC"),
  CONSTRAINT "CLIENTE_CORREO_ibfk_1" FOREIGN KEY ("DNI_O_RUC") REFERENCES "CLIENTE" ("DNI_O_RUC") ON DELETE CASCADE
);


-- swefire_db.CLIENTE_TELEFONO_FIJO definition

CREATE TABLE "CLIENTE_TELEFONO_FIJO" (
  "id" int NOT NULL AUTO_INCREMENT,
  "DNI_O_RUC" varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  "numero" varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  "anexo" varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  "descripcion_anexo" varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY ("id"),
  KEY "DNI_O_RUC" ("DNI_O_RUC"),
  CONSTRAINT "CLIENTE_TELEFONO_FIJO_ibfk_1" FOREIGN KEY ("DNI_O_RUC") REFERENCES "CLIENTE" ("DNI_O_RUC") ON DELETE CASCADE
);


-- swefire_db.CLIENTE_TELEFONO_MOVIL definition

CREATE TABLE "CLIENTE_TELEFONO_MOVIL" (
  "id" int NOT NULL AUTO_INCREMENT,
  "DNI_O_RUC" varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  "telefono" varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  "persona" varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY ("id"),
  KEY "DNI_O_RUC" ("DNI_O_RUC"),
  CONSTRAINT "CLIENTE_TELEFONO_MOVIL_ibfk_1" FOREIGN KEY ("DNI_O_RUC") REFERENCES "CLIENTE" ("DNI_O_RUC") ON DELETE CASCADE
);


-- swefire_db.FABRICANTE_CONTACTO definition

CREATE TABLE "FABRICANTE_CONTACTO" (
  "id" int NOT NULL AUTO_INCREMENT,
  "ID_Fabricante" int NOT NULL,
  "persona_contacto" varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  "correo_contacto" varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  "numero_contacto" varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  "anexo_contacto" varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  "area_contacto" varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  "idioma" varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY ("id"),
  KEY "ID_Fabricante" ("ID_Fabricante"),
  CONSTRAINT "FABRICANTE_CONTACTO_ibfk_1" FOREIGN KEY ("ID_Fabricante") REFERENCES "FABRICANTE" ("ID_Fabricante") ON DELETE CASCADE
);


-- swefire_db.INVENTARIO definition

CREATE TABLE "INVENTARIO" (
  "Id_Objeto" int NOT NULL AUTO_INCREMENT,
  "lugar_almacenaje" varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  "cantidad" int DEFAULT '0',
  "nombre_objeto" varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  "ID_Fabricante" int DEFAULT NULL,
  "orden_compra" varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  "fecha_compra" date DEFAULT NULL,
  "factura" varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  "garantia" varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  "numero_serial" varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  "ano_fabricacion" year DEFAULT NULL,
  "peso" decimal(10,2) DEFAULT NULL,
  "estado" enum('disponible','en mantenimiento','malogrado','en trabajo') COLLATE utf8mb4_unicode_ci DEFAULT 'disponible',
  "precio_compra" decimal(12,2) DEFAULT NULL,
  "precio_envio" decimal(12,2) DEFAULT NULL,
  "responsable_envio" varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  "precio_comercial" decimal(12,2) DEFAULT NULL,
  "mant_requerimiento" enum('si','no') COLLATE utf8mb4_unicode_ci DEFAULT 'no',
  "mant_ultimo" date DEFAULT NULL,
  "mant_fecha_caducidad" date DEFAULT NULL,
  "mant_responsable" varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  "mant_contacto" varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY ("Id_Objeto"),
  KEY "ID_Fabricante" ("ID_Fabricante"),
  CONSTRAINT "INVENTARIO_ibfk_1" FOREIGN KEY ("ID_Fabricante") REFERENCES "FABRICANTE" ("ID_Fabricante") ON DELETE SET NULL
);


-- swefire_db.INVENTARIO_USO definition

CREATE TABLE "INVENTARIO_USO" (
  "id" int NOT NULL AUTO_INCREMENT,
  "Id_Objeto" int NOT NULL,
  "uso" enum('venta','alquiler','uso en proyectos') COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY ("id"),
  KEY "Id_Objeto" ("Id_Objeto"),
  CONSTRAINT "INVENTARIO_USO_ibfk_1" FOREIGN KEY ("Id_Objeto") REFERENCES "INVENTARIO" ("Id_Objeto") ON DELETE CASCADE
);


-- swefire_db.PERFIL_BREVETE definition

CREATE TABLE "PERFIL_BREVETE" (
  "id" int NOT NULL AUTO_INCREMENT,
  "DNI_perfil" varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  "categoria" varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  "pdf_brevete" varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  "fecha_vencimiento" date DEFAULT NULL,
  PRIMARY KEY ("id"),
  KEY "DNI_perfil" ("DNI_perfil"),
  CONSTRAINT "PERFIL_BREVETE_ibfk_1" FOREIGN KEY ("DNI_perfil") REFERENCES "PERFIL" ("DNI") ON DELETE CASCADE
);


-- swefire_db.PERFIL_CERTIFICACION definition

CREATE TABLE "PERFIL_CERTIFICACION" (
  "id" int NOT NULL AUTO_INCREMENT,
  "DNI_perfil" varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  "nombre" varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  "institucion" varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  "fecha_validez" date DEFAULT NULL,
  "foto" varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY ("id"),
  KEY "DNI_perfil" ("DNI_perfil"),
  CONSTRAINT "PERFIL_CERTIFICACION_ibfk_1" FOREIGN KEY ("DNI_perfil") REFERENCES "PERFIL" ("DNI") ON DELETE CASCADE
);


-- swefire_db.PERFIL_CREDENCIALES_RRHH definition

CREATE TABLE "PERFIL_CREDENCIALES_RRHH" (
  "id" int NOT NULL AUTO_INCREMENT,
  "DNI_perfil" varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  "usuario_RRHH" varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  "contrasena_RRHH" varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY ("id"),
  KEY "DNI_perfil" ("DNI_perfil"),
  CONSTRAINT "PERFIL_CREDENCIALES_RRHH_ibfk_1" FOREIGN KEY ("DNI_perfil") REFERENCES "PERFIL" ("DNI") ON DELETE CASCADE
);


-- swefire_db.PERFIL_EDUCACION definition

CREATE TABLE "PERFIL_EDUCACION" (
  "id" int NOT NULL AUTO_INCREMENT,
  "DNI_perfil" varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  "nombre_educacion" varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  "nivel_educacion" varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  "institucion" varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY ("id"),
  KEY "DNI_perfil" ("DNI_perfil"),
  CONSTRAINT "PERFIL_EDUCACION_ibfk_1" FOREIGN KEY ("DNI_perfil") REFERENCES "PERFIL" ("DNI") ON DELETE CASCADE
);


-- swefire_db.SERVICIO_PERSONAL_REQUERIDO definition

CREATE TABLE "SERVICIO_PERSONAL_REQUERIDO" (
  "id" int NOT NULL AUTO_INCREMENT,
  "ID_Servicio" int NOT NULL,
  "profesion" varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  "cantidad" int DEFAULT NULL,
  "disponibilidad" varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  "requerimiento_legal" varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY ("id"),
  KEY "ID_Servicio" ("ID_Servicio"),
  CONSTRAINT "SERVICIO_PERSONAL_REQUERIDO_ibfk_1" FOREIGN KEY ("ID_Servicio") REFERENCES "SERVICIO" ("ID_Servicio") ON DELETE CASCADE
);


-- swefire_db.SOLICITUD definition

CREATE TABLE "SOLICITUD" (
  "ID" int NOT NULL AUTO_INCREMENT,
  "Id_Cliente" varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  "descripcion" text COLLATE utf8mb4_unicode_ci,
  "ubicacion" varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  "ProductoEnvio" varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  "CamionesEnvio" varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  "ObsGenerales" text COLLATE utf8mb4_unicode_ci,
  "ObsEleccion" text COLLATE utf8mb4_unicode_ci,
    "estado" enum('pendiente','aceptado','rechazado') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  "Respuesta" text COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY ("ID"),
  KEY "Id_Cliente" ("Id_Cliente"),
  CONSTRAINT "SOLICITUD_ibfk_1" FOREIGN KEY ("Id_Cliente") REFERENCES "CLIENTE" ("DNI_O_RUC") ON DELETE CASCADE
);


-- swefire_db.SOLICITUD_INVENTARIO definition

CREATE TABLE "SOLICITUD_INVENTARIO" (
  "id" int NOT NULL AUTO_INCREMENT,
  "ID_Solicitud" int NOT NULL,
  "ID_Inventario" int NOT NULL,
  "cantidad" int DEFAULT NULL,
  "intencion" enum('comprar','alquilar') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  "dias_alquilados" int DEFAULT NULL,
  PRIMARY KEY ("id"),
  KEY "ID_Solicitud" ("ID_Solicitud"),
  KEY "ID_Inventario" ("ID_Inventario"),
  CONSTRAINT "SOLICITUD_INVENTARIO_ibfk_1" FOREIGN KEY ("ID_Solicitud") REFERENCES "SOLICITUD" ("ID") ON DELETE CASCADE,
  CONSTRAINT "SOLICITUD_INVENTARIO_ibfk_2" FOREIGN KEY ("ID_Inventario") REFERENCES "INVENTARIO" ("Id_Objeto") ON DELETE CASCADE
);


-- swefire_db.SOLICITUD_MEDIO_COMUNICACION definition

CREATE TABLE "SOLICITUD_MEDIO_COMUNICACION" (
  "id" int NOT NULL AUTO_INCREMENT,
  "ID_Solicitud" int NOT NULL,
  "cliente_email" varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  "cliente_telefono" varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY ("id"),
  KEY "ID_Solicitud" ("ID_Solicitud"),
  CONSTRAINT "SOLICITUD_MEDIO_COMUNICACION_ibfk_1" FOREIGN KEY ("ID_Solicitud") REFERENCES "SOLICITUD" ("ID") ON DELETE CASCADE
);


-- swefire_db.SOLICITUD_SERVICIO definition

CREATE TABLE "SOLICITUD_SERVICIO" (
  "id" int NOT NULL AUTO_INCREMENT,
  "ID_Solicitud" int NOT NULL,
  "ID_Servicio" int NOT NULL,
  "fecha_inicio_servicio" date DEFAULT NULL,
  "horario_servicio" varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  "fecha_fin_servicio" date DEFAULT NULL,
  PRIMARY KEY ("id"),
  KEY "ID_Solicitud" ("ID_Solicitud"),
  KEY "ID_Servicio" ("ID_Servicio"),
  CONSTRAINT "SOLICITUD_SERVICIO_ibfk_1" FOREIGN KEY ("ID_Solicitud") REFERENCES "SOLICITUD" ("ID") ON DELETE CASCADE,
  CONSTRAINT "SOLICITUD_SERVICIO_ibfk_2" FOREIGN KEY ("ID_Servicio") REFERENCES "SERVICIO" ("ID_Servicio") ON DELETE CASCADE
);


-- swefire_db.USUARIO definition

CREATE TABLE "USUARIO" (
  "idusuario" int NOT NULL AUTO_INCREMENT,
  "dni_perfil" varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  "rol" varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  "contrasena" varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  "correo" varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  "temp_pass_unhashed" varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY ("idusuario"),
  UNIQUE KEY "correo" ("correo"),
  KEY "dni_perfil" ("dni_perfil"),
  CONSTRAINT "USUARIO_ibfk_1" FOREIGN KEY ("dni_perfil") REFERENCES "PERFIL" ("DNI") ON DELETE CASCADE
);


-- swefire_db.CAMION_INVENTARIO definition

CREATE TABLE "CAMION_INVENTARIO" (
  "id" int NOT NULL AUTO_INCREMENT,
  "Placa" varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  "Id_Objeto" int NOT NULL,
  "cantidad_requerida" int DEFAULT '0',
  "cantidad_actual" int DEFAULT '0',
  "ubicacion_en_camion" varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  "requerido_legal" enum('si','no') COLLATE utf8mb4_unicode_ci DEFAULT 'no',
  PRIMARY KEY ("id"),
  KEY "Placa" ("Placa"),
  KEY "Id_Objeto" ("Id_Objeto"),
  CONSTRAINT "CAMION_INVENTARIO_ibfk_1" FOREIGN KEY ("Placa") REFERENCES "CAMION" ("Placa") ON DELETE CASCADE,
  CONSTRAINT "CAMION_INVENTARIO_ibfk_2" FOREIGN KEY ("Id_Objeto") REFERENCES "INVENTARIO" ("Id_Objeto") ON DELETE CASCADE
);


-- swefire_db.COTIZACION_COMERCIAL definition

CREATE TABLE "COTIZACION_COMERCIAL" (
  "ID" int NOT NULL AUTO_INCREMENT,
  "version" int DEFAULT '1',
  "nombre" varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  "id_solicitud" int DEFAULT NULL,
  "DNI_O_RUC" varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  "precio_total" decimal(14,2) DEFAULT NULL,
  "estado" enum('aprobado','rechazado por cliente','descartada') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  "comentario_cliente" text COLLATE utf8mb4_unicode_ci,
  "fecha_emision" date DEFAULT NULL,
  "fecha_vigencia" date DEFAULT NULL,
  "observacion" varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  "Tasa_Cambio" float DEFAULT NULL,
  "condiciones" text COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY ("ID"),
  KEY "id_solicitud" ("id_solicitud"),
  KEY "DNI_O_RUC" ("DNI_O_RUC"),
  CONSTRAINT "COTIZACION_COMERCIAL_ibfk_1" FOREIGN KEY ("id_solicitud") REFERENCES "SOLICITUD" ("ID") ON DELETE SET NULL,
  CONSTRAINT "COTIZACION_COMERCIAL_ibfk_2" FOREIGN KEY ("DNI_O_RUC") REFERENCES "CLIENTE" ("DNI_O_RUC") ON DELETE SET NULL
);


-- swefire_db.COTIZACION_INVENTARIO definition

CREATE TABLE "COTIZACION_INVENTARIO" (
  "id" int NOT NULL AUTO_INCREMENT,
  "ID_Cotizacion" int NOT NULL,
  "ID_Inventario" int NOT NULL,
  "cantidad" int DEFAULT NULL,
  "intencion" enum('comprar','alquilar') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  "dias_alquilados" int DEFAULT NULL,
  "precio_comercial" decimal(12,2) DEFAULT NULL,
  "fecha_salida_taller" datetime DEFAULT NULL,
  "fecha_ingreso_taller" datetime DEFAULT NULL,
  "observaciones" text COLLATE utf8mb4_unicode_ci,
  "Costo_Comercial" float DEFAULT NULL,
  PRIMARY KEY ("id"),
  KEY "ID_Cotizacion" ("ID_Cotizacion"),
  KEY "ID_Inventario" ("ID_Inventario"),
  CONSTRAINT "COTIZACION_INVENTARIO_ibfk_1" FOREIGN KEY ("ID_Cotizacion") REFERENCES "COTIZACION_COMERCIAL" ("ID") ON DELETE CASCADE,
  CONSTRAINT "COTIZACION_INVENTARIO_ibfk_2" FOREIGN KEY ("ID_Inventario") REFERENCES "INVENTARIO" ("Id_Objeto") ON DELETE CASCADE
);


-- swefire_db.COTIZACION_PERSONAL definition

CREATE TABLE "COTIZACION_PERSONAL" (
  "id" int NOT NULL AUTO_INCREMENT,
  "ID_Cotizacion" int NOT NULL,
  "ID_Usuario" int NOT NULL,
  "rol_en_trabajo" varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  "fecha_entrada" date DEFAULT NULL,
  "fecha_salida" date DEFAULT NULL,
  "dias_trabajados" int DEFAULT NULL,
  PRIMARY KEY ("id"),
  KEY "ID_Cotizacion" ("ID_Cotizacion"),
  KEY "ID_Usuario" ("ID_Usuario"),
  CONSTRAINT "COTIZACION_PERSONAL_ibfk_1" FOREIGN KEY ("ID_Cotizacion") REFERENCES "COTIZACION_COMERCIAL" ("ID") ON DELETE CASCADE,
  CONSTRAINT "COTIZACION_PERSONAL_ibfk_2" FOREIGN KEY ("ID_Usuario") REFERENCES "USUARIO" ("idusuario") ON DELETE CASCADE
);


-- swefire_db.COTIZACION_SERVICIO definition

CREATE TABLE "COTIZACION_SERVICIO" (
  "id" int NOT NULL AUTO_INCREMENT,
  "ID_Cotizacion" int NOT NULL,
  "ID_Servicio" int NOT NULL,
  "fecha_inicio" date DEFAULT NULL,
  "fecha_finalizacion" date DEFAULT NULL,
  "jornada" varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  "precio_comercial" decimal(12,2) DEFAULT NULL,
  "Ubicacion" varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY ("id"),
  KEY "ID_Cotizacion" ("ID_Cotizacion"),
  KEY "ID_Servicio" ("ID_Servicio"),
  CONSTRAINT "COTIZACION_SERVICIO_ibfk_1" FOREIGN KEY ("ID_Cotizacion") REFERENCES "COTIZACION_COMERCIAL" ("ID") ON DELETE CASCADE,
  CONSTRAINT "COTIZACION_SERVICIO_ibfk_2" FOREIGN KEY ("ID_Servicio") REFERENCES "SERVICIO" ("ID_Servicio") ON DELETE CASCADE
);


-- swefire_db.PRESUPUESTO_INTERNO definition

CREATE TABLE "PRESUPUESTO_INTERNO" (
  "ID" int NOT NULL AUTO_INCREMENT,
  "ID_Cotizacion" int NOT NULL,
  "costos_indirectos" decimal(12,2) DEFAULT NULL,
  "coste_total_estimado" decimal(14,2) DEFAULT NULL,
  PRIMARY KEY ("ID"),
  KEY "ID_Cotizacion" ("ID_Cotizacion"),
  CONSTRAINT "PRESUPUESTO_INTERNO_ibfk_1" FOREIGN KEY ("ID_Cotizacion") REFERENCES "COTIZACION_COMERCIAL" ("ID") ON DELETE CASCADE
);


-- swefire_db.PRESUPUESTO_MANO_OBRA definition

CREATE TABLE "PRESUPUESTO_MANO_OBRA" (
  "id" int NOT NULL AUTO_INCREMENT,
  "ID_Presupuesto" int NOT NULL,
  "profesion_ejercida" varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  "costo_x_hora" decimal(10,2) DEFAULT NULL,
  "costo_general" decimal(12,2) DEFAULT NULL,
  PRIMARY KEY ("id"),
  KEY "ID_Presupuesto" ("ID_Presupuesto"),
  CONSTRAINT "PRESUPUESTO_MANO_OBRA_ibfk_1" FOREIGN KEY ("ID_Presupuesto") REFERENCES "PRESUPUESTO_INTERNO" ("ID") ON DELETE CASCADE
);


-- swefire_db.PRESUPUESTO_MATERIAL_DIRECTO definition

CREATE TABLE "PRESUPUESTO_MATERIAL_DIRECTO" (
  "id" int NOT NULL AUTO_INCREMENT,
  "ID_Presupuesto" int NOT NULL,
  "nombre" varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  "costo" decimal(12,2) DEFAULT NULL,
  PRIMARY KEY ("id"),
  KEY "ID_Presupuesto" ("ID_Presupuesto"),
  CONSTRAINT "PRESUPUESTO_MATERIAL_DIRECTO_ibfk_1" FOREIGN KEY ("ID_Presupuesto") REFERENCES "PRESUPUESTO_INTERNO" ("ID") ON DELETE CASCADE
);


-- swefire_db.PRESUPUESTO_SERVICIO definition

CREATE TABLE "PRESUPUESTO_SERVICIO" (
  "id" int NOT NULL AUTO_INCREMENT,
  "ID_Presupuesto" int NOT NULL,
  "nombre_servicio" varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  "costo" decimal(12,2) DEFAULT NULL,
  PRIMARY KEY ("id"),
  KEY "ID_Presupuesto" ("ID_Presupuesto"),
  CONSTRAINT "PRESUPUESTO_SERVICIO_ibfk_1" FOREIGN KEY ("ID_Presupuesto") REFERENCES "PRESUPUESTO_INTERNO" ("ID") ON DELETE CASCADE
);


-- swefire_db.COTIZACION_CAMION definition

CREATE TABLE "COTIZACION_CAMION" (
  "id" int NOT NULL AUTO_INCREMENT,
  "ID_Cotizacion" int NOT NULL,
  "Placa" varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  "uso" varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  "fecha_hora_entrada" datetime DEFAULT NULL,
  "fecha_hora_salida" datetime DEFAULT NULL,
  "ID_Piloto" int DEFAULT NULL,
  "PrecioUnit" float DEFAULT NULL,
  PRIMARY KEY ("id"),
  KEY "ID_Cotizacion" ("ID_Cotizacion"),
  KEY "Placa" ("Placa"),
  KEY "ID_Piloto" ("ID_Piloto"),
  CONSTRAINT "COTIZACION_CAMION_ibfk_1" FOREIGN KEY ("ID_Cotizacion") REFERENCES "COTIZACION_COMERCIAL" ("ID") ON DELETE CASCADE,
  CONSTRAINT "COTIZACION_CAMION_ibfk_2" FOREIGN KEY ("Placa") REFERENCES "CAMION" ("Placa") ON DELETE CASCADE,
  CONSTRAINT "COTIZACION_CAMION_ibfk_3" FOREIGN KEY ("ID_Piloto") REFERENCES "USUARIO" ("idusuario") ON DELETE SET NULL
);


-- swefire_db.PRESUPUESTO_COSTO_INDIRECTO definition

CREATE TABLE "PRESUPUESTO_COSTO_INDIRECTO" (
  "id" int NOT NULL AUTO_INCREMENT,
  "ID_Presupuesto" int NOT NULL,
  "nombre_costo" varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  "costo" decimal(12,2) DEFAULT NULL,
  PRIMARY KEY ("id"),
  KEY "ID_Presupuesto" ("ID_Presupuesto"),
  CONSTRAINT "PRESUPUESTO_COSTO_INDIRECTO_ibfk_1" FOREIGN KEY ("ID_Presupuesto") REFERENCES "PRESUPUESTO_INTERNO" ("ID") ON DELETE CASCADE
);


-- swefire_db.PRESUPUESTO_GASTO_ADMIN definition

CREATE TABLE "PRESUPUESTO_GASTO_ADMIN" (
  "id" int NOT NULL AUTO_INCREMENT,
  "ID_Presupuesto" int NOT NULL,
  "nombre_gasto" varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  "costo" decimal(12,2) DEFAULT NULL,
  PRIMARY KEY ("id"),
  KEY "ID_Presupuesto" ("ID_Presupuesto"),
  CONSTRAINT "PRESUPUESTO_GASTO_ADMIN_ibfk_1" FOREIGN KEY ("ID_Presupuesto") REFERENCES "PRESUPUESTO_INTERNO" ("ID") ON DELETE CASCADE
);


-- swefire_db.INCIDENCIA definition

CREATE TABLE "INCIDENCIA" (
  "id_incidencia" int NOT NULL AUTO_INCREMENT,
  "id_proyecto" int DEFAULT NULL,
  "empresa_involucrada" varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  "cotizacion_remuneracion" int DEFAULT NULL,
  "comentario" text COLLATE utf8mb4_unicode_ci,
  "estado" varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY ("id_incidencia"),
  KEY "id_proyecto" ("id_proyecto"),
  KEY "empresa_involucrada" ("empresa_involucrada"),
  KEY "cotizacion_remuneracion" ("cotizacion_remuneracion"),
  CONSTRAINT "INCIDENCIA_ibfk_1" FOREIGN KEY ("id_proyecto") REFERENCES "PROYECTO" ("id_Proyecto") ON DELETE SET NULL,
  CONSTRAINT "INCIDENCIA_ibfk_2" FOREIGN KEY ("empresa_involucrada") REFERENCES "CLIENTE" ("DNI_O_RUC") ON DELETE SET NULL,
  CONSTRAINT "INCIDENCIA_ibfk_3" FOREIGN KEY ("cotizacion_remuneracion") REFERENCES "COTIZACION_COMERCIAL" ("ID") ON DELETE SET NULL
);


-- swefire_db.INCIDENCIA_OBJETOS definition

CREATE TABLE "INCIDENCIA_OBJETOS" (
  "id" int NOT NULL AUTO_INCREMENT,
  "id_incidencia" int NOT NULL,
  "id_proyecto_inventario" int DEFAULT NULL,
  "id_proyecto_camion" int DEFAULT NULL,
  "ocurrencia_inventario" enum('averia','perdida','robo','por mantener','otro') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  "ocurrencia_camion" enum('averia','perdida','robo','por mantener','otro','ninguna') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  "fecha_perdida" datetime DEFAULT NULL,
  "cantidad" int DEFAULT NULL,
  "ultima_ubicacion" text COLLATE utf8mb4_unicode_ci,
  "comentario" text COLLATE utf8mb4_unicode_ci,
  "precio_remunerar" decimal(10,2) DEFAULT NULL,
  PRIMARY KEY ("id"),
  KEY "id_incidencia" ("id_incidencia"),
  KEY "id_proyecto_inventario" ("id_proyecto_inventario"),
  KEY "id_proyecto_camion" ("id_proyecto_camion"),
  CONSTRAINT "INCIDENCIA_OBJETOS_ibfk_1" FOREIGN KEY ("id_incidencia") REFERENCES "INCIDENCIA" ("id_incidencia") ON DELETE CASCADE,
  CONSTRAINT "INCIDENCIA_OBJETOS_ibfk_2" FOREIGN KEY ("id_proyecto_inventario") REFERENCES "PROYECTO_INVENTARIO" ("id") ON DELETE SET NULL,
  CONSTRAINT "INCIDENCIA_OBJETOS_ibfk_3" FOREIGN KEY ("id_proyecto_camion") REFERENCES "PROYECTO_CAMION" ("id") ON DELETE SET NULL
);


-- swefire_db.INVOLUCRADO definition

CREATE TABLE "INVOLUCRADO" (
  "id" int NOT NULL AUTO_INCREMENT,
  "dni_involucrado" varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  "id_trabajo" int NOT NULL,
  "id_incidencia" int NOT NULL,
  "version_de_hechos" text COLLATE utf8mb4_unicode_ci,
  "comentario" text COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY ("id"),
  KEY "dni_involucrado" ("dni_involucrado"),
  KEY "id_trabajo" ("id_trabajo"),
  KEY "id_incidencia" ("id_incidencia"),
  CONSTRAINT "INVOLUCRADO_ibfk_1" FOREIGN KEY ("dni_involucrado") REFERENCES "PERFIL" ("DNI") ON DELETE CASCADE,
  CONSTRAINT "INVOLUCRADO_ibfk_2" FOREIGN KEY ("id_trabajo") REFERENCES "TRABAJO" ("Id_trabajo") ON DELETE CASCADE,
  CONSTRAINT "INVOLUCRADO_ibfk_3" FOREIGN KEY ("id_incidencia") REFERENCES "INCIDENCIA" ("id_incidencia") ON DELETE CASCADE
);


-- swefire_db.PROYECTO definition

CREATE TABLE "PROYECTO" (
  "id_Proyecto" int NOT NULL AUTO_INCREMENT,
  "descripcion_servicio" text COLLATE utf8mb4_unicode_ci,
  "ID_Trabajo" int DEFAULT NULL,
  "Id_Cliente" varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  "ubicacion" varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  "id_cotizacion" int DEFAULT NULL,
  "orden_servicio" varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  "informe_final" varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  "factura" varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  "fecha_inicio" date DEFAULT NULL,
  "fecha_fin" date DEFAULT NULL,
  "observaciones" text COLLATE utf8mb4_unicode_ci,
  "estado" enum('Pendiente','En Ejecución','Completado','En proceso legal') COLLATE utf8mb4_unicode_ci DEFAULT 'Pendiente',
  PRIMARY KEY ("id_Proyecto"),
  KEY "Id_Cliente" ("Id_Cliente"),
  KEY "id_cotizacion" ("id_cotizacion"),
  KEY "fk_proyecto_trabajo" ("ID_Trabajo"),
  CONSTRAINT "fk_proyecto_trabajo" FOREIGN KEY ("ID_Trabajo") REFERENCES "TRABAJO" ("Id_trabajo") ON DELETE SET NULL,
  CONSTRAINT "PROYECTO_ibfk_1" FOREIGN KEY ("Id_Cliente") REFERENCES "CLIENTE" ("DNI_O_RUC") ON DELETE SET NULL,
  CONSTRAINT "PROYECTO_ibfk_2" FOREIGN KEY ("id_cotizacion") REFERENCES "COTIZACION_COMERCIAL" ("ID") ON DELETE SET NULL
);


-- swefire_db.PROYECTO_CAMION definition

CREATE TABLE "PROYECTO_CAMION" (
  "id" int NOT NULL AUTO_INCREMENT,
  "id_Proyecto" int NOT NULL,
  "Placa" varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  "personal_manejando" int DEFAULT NULL,
  "fecha_hora_entrada" datetime DEFAULT NULL,
  "fecha_hora_salida" datetime DEFAULT NULL,
  PRIMARY KEY ("id"),
  KEY "id_Proyecto" ("id_Proyecto"),
  KEY "Placa" ("Placa"),
  KEY "personal_manejando" ("personal_manejando"),
  CONSTRAINT "PROYECTO_CAMION_ibfk_1" FOREIGN KEY ("id_Proyecto") REFERENCES "PROYECTO" ("id_Proyecto") ON DELETE CASCADE,
  CONSTRAINT "PROYECTO_CAMION_ibfk_2" FOREIGN KEY ("Placa") REFERENCES "CAMION" ("Placa") ON DELETE CASCADE,
  CONSTRAINT "PROYECTO_CAMION_ibfk_3" FOREIGN KEY ("personal_manejando") REFERENCES "USUARIO" ("idusuario") ON DELETE SET NULL
);


-- swefire_db.PROYECTO_DOCUMENTACION definition

CREATE TABLE "PROYECTO_DOCUMENTACION" (
  "id" int NOT NULL AUTO_INCREMENT,
  "id_Proyecto" int NOT NULL,
  "pdf_url" varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY ("id"),
  KEY "id_Proyecto" ("id_Proyecto"),
  CONSTRAINT "PROYECTO_DOCUMENTACION_ibfk_1" FOREIGN KEY ("id_Proyecto") REFERENCES "PROYECTO" ("id_Proyecto") ON DELETE CASCADE
);


-- swefire_db.PROYECTO_INVENTARIO definition

CREATE TABLE "PROYECTO_INVENTARIO" (
  "id" int NOT NULL AUTO_INCREMENT,
  "id_Proyecto" int NOT NULL,
  "Id_Objeto" int NOT NULL,
  "cantidad_objeto" int DEFAULT NULL,
  "estado_post" enum('aceptable','robado','averiado','desconocido') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  "fecha_salida" date DEFAULT NULL,
  "fecha_retorno" date DEFAULT NULL,
  "metodo_traslado" varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY ("id"),
  KEY "id_Proyecto" ("id_Proyecto"),
  KEY "Id_Objeto" ("Id_Objeto"),
  CONSTRAINT "PROYECTO_INVENTARIO_ibfk_1" FOREIGN KEY ("id_Proyecto") REFERENCES "PROYECTO" ("id_Proyecto") ON DELETE CASCADE,
  CONSTRAINT "PROYECTO_INVENTARIO_ibfk_2" FOREIGN KEY ("Id_Objeto") REFERENCES "INVENTARIO" ("Id_Objeto") ON DELETE CASCADE
);


-- swefire_db.TRABAJO definition

CREATE TABLE "TRABAJO" (
  "Id_trabajo" int NOT NULL AUTO_INCREMENT,
  "Id_Proyecto" int DEFAULT NULL,
  "fecha" date DEFAULT NULL,
  "horario" varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  "asistencia" text COLLATE utf8mb4_unicode_ci,
  "comentario" text COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY ("Id_trabajo"),
  KEY "fk_trabajo_proyecto" ("Id_Proyecto"),
  CONSTRAINT "fk_trabajo_proyecto" FOREIGN KEY ("Id_Proyecto") REFERENCES "PROYECTO" ("id_Proyecto") ON DELETE SET NULL,
  CONSTRAINT "TRABAJO_ibfk_1" FOREIGN KEY ("Id_Proyecto") REFERENCES "PROYECTO" ("id_Proyecto") ON DELETE SET NULL
);


-- swefire_db.TRABAJO_JORNADA definition

CREATE TABLE "TRABAJO_JORNADA" (
  "id" int NOT NULL AUTO_INCREMENT,
  "Id_trabajo" int NOT NULL,
  "DNI_Trabajador" varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  "dia" date DEFAULT NULL,
  "horario_entrada" time DEFAULT NULL,
  "horario_salida" time DEFAULT NULL,
  PRIMARY KEY ("id"),
  KEY "Id_trabajo" ("Id_trabajo"),
  KEY "DNI_Trabajador" ("DNI_Trabajador"),
  CONSTRAINT "TRABAJO_JORNADA_ibfk_1" FOREIGN KEY ("Id_trabajo") REFERENCES "TRABAJO" ("Id_trabajo") ON DELETE CASCADE,
  CONSTRAINT "TRABAJO_JORNADA_ibfk_2" FOREIGN KEY ("DNI_Trabajador") REFERENCES "PERFIL" ("DNI") ON DELETE CASCADE
);


-- swefire_db.TRABAJO_RRHH definition

CREATE TABLE "TRABAJO_RRHH" (
  "id" int NOT NULL AUTO_INCREMENT,
  "Id_trabajo" int NOT NULL,
  "DNI_Trabajador" varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  "estado_pago" enum('completado','por realizar','no pagar aun','devolucion pendiente') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY ("id"),
  KEY "Id_trabajo" ("Id_trabajo"),
  KEY "DNI_Trabajador" ("DNI_Trabajador"),
  CONSTRAINT "TRABAJO_RRHH_ibfk_1" FOREIGN KEY ("Id_trabajo") REFERENCES "TRABAJO" ("Id_trabajo") ON DELETE CASCADE,
  CONSTRAINT "TRABAJO_RRHH_ibfk_2" FOREIGN KEY ("DNI_Trabajador") REFERENCES "PERFIL" ("DNI") ON DELETE CASCADE
);


-- swefire_db.TRABAJO_RRHH_PDF definition

CREATE TABLE "TRABAJO_RRHH_PDF" (
  "id" int NOT NULL AUTO_INCREMENT,
  "ID_RRHH" int NOT NULL,
  "pdf_url" varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY ("id"),
  KEY "ID_RRHH" ("ID_RRHH"),
  CONSTRAINT "TRABAJO_RRHH_PDF_ibfk_1" FOREIGN KEY ("ID_RRHH") REFERENCES "TRABAJO_RRHH" ("id") ON DELETE CASCADE
);

-- ============================================================
-- REFERENCIAS CRUZADAS (FKs que se agregaron al final)
-- ============================================================
ALTER TABLE PROYECTO
    ADD CONSTRAINT fk_proyecto_trabajo
    FOREIGN KEY (ID_Trabajo) REFERENCES TRABAJO(Id_trabajo) ON DELETE SET NULL;

ALTER TABLE TRABAJO
    ADD CONSTRAINT fk_trabajo_proyecto
    FOREIGN KEY (Id_Proyecto) REFERENCES PROYECTO(id_Proyecto) ON DELETE SET NULL;