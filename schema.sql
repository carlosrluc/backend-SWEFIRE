-- ============================================================
-- SWEFIRE DB - SCHEMA COMPLETO
-- ============================================================

CREATE DATABASE IF NOT EXISTS swefire_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE swefire_db;

-- ============================================================
-- TABLA: PERFIL
-- ============================================================
CREATE TABLE PERFIL (
    DNI             VARCHAR(20)     PRIMARY KEY,
    Nombre          VARCHAR(100)    NOT NULL,
    Apellido        VARCHAR(100)    NOT NULL,
    Genero          VARCHAR(20),
    RUC             VARCHAR(20),
    fecha_nacimiento DATE,
    correo_contacto  VARCHAR(150),
    telefono_contacto VARCHAR(20),
    estado_civil    VARCHAR(30),
    distrito_residencia VARCHAR(100),
    seguro_vida_ley ENUM('si','no') DEFAULT 'no',
    aficiones       TEXT,
    experiencia     TEXT,
    comentarios     TEXT,
    estado          ENUM('inhabilitado','en trabajo','disponible') DEFAULT 'disponible',
    alergias        TEXT,              -- se guarda como texto separado por comas o JSON
    condicion_medica TEXT,
    profesion       VARCHAR(100),
    nro_cta_bancaria VARCHAR(50),
    cv              VARCHAR(500),      -- ruta al PDF
    foto_perfil     VARCHAR(500)       -- ruta a la imagen
);

-- Subtabla: educacion (pertenece a PERFIL)
CREATE TABLE PERFIL_EDUCACION (
    id              INT             AUTO_INCREMENT PRIMARY KEY,
    DNI_perfil      VARCHAR(20)     NOT NULL,
    nombre_educacion VARCHAR(150),
    nivel_educacion VARCHAR(50),
    institucion     VARCHAR(150),
    FOREIGN KEY (DNI_perfil) REFERENCES PERFIL(DNI) ON DELETE CASCADE
);

-- Subtabla: brevete (pertenece a PERFIL)
CREATE TABLE PERFIL_BREVETE (
    id              INT             AUTO_INCREMENT PRIMARY KEY,
    DNI_perfil      VARCHAR(20)     NOT NULL,
    categoria       VARCHAR(20),
    pdf_brevete     VARCHAR(500),
    fecha_vencimiento DATE,
    FOREIGN KEY (DNI_perfil) REFERENCES PERFIL(DNI) ON DELETE CASCADE
);

-- Subtabla: certificaciones (pertenece a PERFIL)
CREATE TABLE PERFIL_CERTIFICACION (
    id              INT             AUTO_INCREMENT PRIMARY KEY,
    DNI_perfil      VARCHAR(20)     NOT NULL,
    nombre          VARCHAR(150),
    institucion     VARCHAR(150),
    fecha_validez   DATE,
    foto            VARCHAR(500),
    FOREIGN KEY (DNI_perfil) REFERENCES PERFIL(DNI) ON DELETE CASCADE
);

-- Subtabla: credenciales RRHH (pertenece a PERFIL)
CREATE TABLE PERFIL_CREDENCIALES_RRHH (
    id              INT             AUTO_INCREMENT PRIMARY KEY,
    DNI_perfil      VARCHAR(20)     NOT NULL,
    usuario_RRHH    VARCHAR(100),
    contrasena_RRHH VARCHAR(255),
    FOREIGN KEY (DNI_perfil) REFERENCES PERFIL(DNI) ON DELETE CASCADE
);

-- ============================================================
-- TABLA: USUARIO
-- ============================================================
CREATE TABLE USUARIO (
    idusuario       INT             AUTO_INCREMENT PRIMARY KEY,
    dni_perfil      VARCHAR(20)     NOT NULL,
    rol             VARCHAR(50),
    contrasena      VARCHAR(255)    NOT NULL,
    correo          VARCHAR(150)    NOT NULL UNIQUE,
    FOREIGN KEY (dni_perfil) REFERENCES PERFIL(DNI) ON DELETE CASCADE
);

-- ============================================================
-- TABLA: CLIENTE
-- ============================================================
CREATE TABLE CLIENTE (
    DNI_O_RUC       VARCHAR(20)     PRIMARY KEY,
    nombre_comercial VARCHAR(150),
    razon_social    VARCHAR(150),
    rubro           VARCHAR(100),
    ubicacion_facturacion VARCHAR(255),
    observacion     TEXT
);

-- Subtabla: contactos del cliente (pertenece a CLIENTE)
CREATE TABLE CLIENTE_CONTACTO (
    id              INT             AUTO_INCREMENT PRIMARY KEY,
    DNI_O_RUC       VARCHAR(20)     NOT NULL,
    DNI_perfil      VARCHAR(20),    -- FK a PERFIL
    cargo_en_empresa VARCHAR(100),
    lugar_trabajo   VARCHAR(150),
    FOREIGN KEY (DNI_O_RUC) REFERENCES CLIENTE(DNI_O_RUC) ON DELETE CASCADE,
    FOREIGN KEY (DNI_perfil) REFERENCES PERFIL(DNI) ON DELETE SET NULL
);

-- Subtabla: teléfonos móviles del cliente
CREATE TABLE CLIENTE_TELEFONO_MOVIL (
    id              INT             AUTO_INCREMENT PRIMARY KEY,
    DNI_O_RUC       VARCHAR(20)     NOT NULL,
    telefono        VARCHAR(20),
    persona         VARCHAR(100),
    FOREIGN KEY (DNI_O_RUC) REFERENCES CLIENTE(DNI_O_RUC) ON DELETE CASCADE
);

-- Subtabla: correos de la empresa
CREATE TABLE CLIENTE_CORREO (
    id              INT             AUTO_INCREMENT PRIMARY KEY,
    DNI_O_RUC       VARCHAR(20)     NOT NULL,
    correo          VARCHAR(150),
    rama            VARCHAR(100),
    FOREIGN KEY (DNI_O_RUC) REFERENCES CLIENTE(DNI_O_RUC) ON DELETE CASCADE
);

-- Subtabla: teléfonos fijos del cliente
CREATE TABLE CLIENTE_TELEFONO_FIJO (
    id              INT             AUTO_INCREMENT PRIMARY KEY,
    DNI_O_RUC       VARCHAR(20)     NOT NULL,
    numero          VARCHAR(20),
    anexo           VARCHAR(10),
    descripcion_anexo VARCHAR(150),
    FOREIGN KEY (DNI_O_RUC) REFERENCES CLIENTE(DNI_O_RUC) ON DELETE CASCADE
);

-- ============================================================
-- TABLA: FABRICANTE
-- ============================================================
CREATE TABLE FABRICANTE (
    ID_Fabricante   INT             AUTO_INCREMENT PRIMARY KEY,
    nombre_comercial VARCHAR(150),
    ubicacion       VARCHAR(255),
    rubro           VARCHAR(100),
    descripcion     TEXT,
    comentarios     TEXT,
    pago            VARCHAR(100)
);

-- Subtabla: contactos del fabricante
CREATE TABLE FABRICANTE_CONTACTO (
    id                  INT         AUTO_INCREMENT PRIMARY KEY,
    ID_Fabricante       INT         NOT NULL,
    persona_contacto    VARCHAR(100),
    correo_contacto     VARCHAR(150),
    numero_contacto     VARCHAR(20),
    anexo_contacto      VARCHAR(10),
    area_contacto       VARCHAR(100),
    idioma              VARCHAR(50),
    FOREIGN KEY (ID_Fabricante) REFERENCES FABRICANTE(ID_Fabricante) ON DELETE CASCADE
);

-- ============================================================
-- TABLA: INVENTARIO
-- ============================================================
CREATE TABLE INVENTARIO (
    Id_Objeto           INT         AUTO_INCREMENT PRIMARY KEY,
    lugar_almacenaje    VARCHAR(150),
    cantidad            INT         DEFAULT 0,
    nombre_objeto       VARCHAR(150) NOT NULL,
    ID_Fabricante       INT,
    orden_compra        VARCHAR(100),
    fecha_compra        DATE,
    factura             VARCHAR(500),
    garantia            VARCHAR(150),
    numero_serial       VARCHAR(100),
    ano_fabricacion     YEAR,
    peso                DECIMAL(10,2),
    estado              ENUM('disponible','en mantenimiento','malogrado','en trabajo') DEFAULT 'disponible',
    precio_compra       DECIMAL(12,2),
    precio_envio        DECIMAL(12,2),
    responsable_envio   VARCHAR(100),
    precio_comercial    DECIMAL(12,2),
    -- mantenimiento (objeto único, va inline)
    mant_requerimiento  ENUM('si','no') DEFAULT 'no',
    mant_ultimo         DATE,
    mant_fecha_caducidad DATE,
    mant_responsable    VARCHAR(100),
    mant_contacto       VARCHAR(100),
    FOREIGN KEY (ID_Fabricante) REFERENCES FABRICANTE(ID_Fabricante) ON DELETE SET NULL
);

-- Subtabla: uso del inventario (puede ser varios a la vez)
CREATE TABLE INVENTARIO_USO (
    id          INT     AUTO_INCREMENT PRIMARY KEY,
    Id_Objeto   INT     NOT NULL,
    uso         ENUM('venta','alquiler','uso en proyectos') NOT NULL,
    FOREIGN KEY (Id_Objeto) REFERENCES INVENTARIO(Id_Objeto) ON DELETE CASCADE
);

-- ============================================================
-- TABLA: CAMION
-- ============================================================
CREATE TABLE CAMION (
    Placa               VARCHAR(20)  PRIMARY KEY,
    nombre              VARCHAR(100),
    ano_fabricacion     YEAR,
    modelo              VARCHAR(100),
    color               VARCHAR(50),
    caracteristicas     TEXT,
    revision_tecnica    VARCHAR(500),   -- PDF
    fecha_prox_revision DATE,
    ID_Fabricante       INT,
    tarjeta_propiedad   VARCHAR(500),   -- PDF
    vencimiento_tarjeta DATE,
    -- SOAT (objeto único, va inline)
    soat_n_poliza       VARCHAR(100),
    soat_empresa        VARCHAR(100),
    soat_precio         DECIMAL(10,2),
    soat_dia_pago       DATE,
    FOREIGN KEY (ID_Fabricante) REFERENCES FABRICANTE(ID_Fabricante) ON DELETE SET NULL
);

-- Subtabla: mantenimiento del camión
CREATE TABLE CAMION_MANTENIMIENTO (
    id                      INT         AUTO_INCREMENT PRIMARY KEY,
    Placa                   VARCHAR(20) NOT NULL,
    fecha_ultimo_mant       DATE,
    responsable             VARCHAR(100),
    razon                   TEXT,
    contacto_responsable    VARCHAR(100),
    pdf_mantenimiento       VARCHAR(500),
    FOREIGN KEY (Placa) REFERENCES CAMION(Placa) ON DELETE CASCADE
);

-- Subtabla: inventario del camión
CREATE TABLE CAMION_INVENTARIO (
    id                  INT         AUTO_INCREMENT PRIMARY KEY,
    Placa               VARCHAR(20) NOT NULL,
    Id_Objeto           INT         NOT NULL,
    cantidad_requerida  INT         DEFAULT 0,
    cantidad_actual     INT         DEFAULT 0,
    ubicacion_en_camion VARCHAR(100),
    requerido_legal     ENUM('si','no') DEFAULT 'no',
    FOREIGN KEY (Placa) REFERENCES CAMION(Placa) ON DELETE CASCADE,
    FOREIGN KEY (Id_Objeto) REFERENCES INVENTARIO(Id_Objeto) ON DELETE CASCADE
);

-- ============================================================
-- TABLA: SERVICIO
-- ============================================================
CREATE TABLE SERVICIO (
    ID_Servicio         INT         AUTO_INCREMENT PRIMARY KEY,
    nombre              VARCHAR(150) NOT NULL,
    descripcion         TEXT,
    precio_regular      DECIMAL(12,2),
    condicional_precio  TEXT,
    observaciones       TEXT
);

-- Subtabla: personal requerido por servicio
CREATE TABLE SERVICIO_PERSONAL_REQUERIDO (
    id                  INT         AUTO_INCREMENT PRIMARY KEY,
    ID_Servicio         INT         NOT NULL,
    profesion           VARCHAR(100),
    cantidad            INT,
    disponibilidad      VARCHAR(100),
    requerimiento_legal VARCHAR(150),
    FOREIGN KEY (ID_Servicio) REFERENCES SERVICIO(ID_Servicio) ON DELETE CASCADE
);

-- ============================================================
-- TABLA: SOLICITUD
-- ============================================================
CREATE TABLE SOLICITUD (
    ID              INT         AUTO_INCREMENT PRIMARY KEY,
    Id_Cliente      VARCHAR(20) NOT NULL,
    descripcion     TEXT,
    ubicacion       VARCHAR(255),
    FOREIGN KEY (Id_Cliente) REFERENCES CLIENTE(DNI_O_RUC) ON DELETE CASCADE
);

-- Subtabla: medios de comunicación de la solicitud
CREATE TABLE SOLICITUD_MEDIO_COMUNICACION (
    id              INT         AUTO_INCREMENT PRIMARY KEY,
    ID_Solicitud    INT         NOT NULL,
    cliente_email   VARCHAR(150),
    cliente_telefono VARCHAR(20),
    FOREIGN KEY (ID_Solicitud) REFERENCES SOLICITUD(ID) ON DELETE CASCADE
);

-- Subtabla: servicios de la solicitud
CREATE TABLE SOLICITUD_SERVICIO (
    id              INT         AUTO_INCREMENT PRIMARY KEY,
    ID_Solicitud    INT         NOT NULL,
    ID_Servicio     INT         NOT NULL,
    fecha_servicio  DATE,
    horario_servicio VARCHAR(50),
    FOREIGN KEY (ID_Solicitud) REFERENCES SOLICITUD(ID) ON DELETE CASCADE,
    FOREIGN KEY (ID_Servicio) REFERENCES SERVICIO(ID_Servicio) ON DELETE CASCADE
);

-- Subtabla: inventario requerido en la solicitud
CREATE TABLE SOLICITUD_INVENTARIO (
    id              INT         AUTO_INCREMENT PRIMARY KEY,
    ID_Solicitud    INT         NOT NULL,
    ID_Inventario   INT         NOT NULL,
    cantidad        INT,
    intencion       ENUM('comprar','alquilar'),
    dias_alquilados INT,
    FOREIGN KEY (ID_Solicitud) REFERENCES SOLICITUD(ID) ON DELETE CASCADE,
    FOREIGN KEY (ID_Inventario) REFERENCES INVENTARIO(Id_Objeto) ON DELETE CASCADE
);

-- ============================================================
-- TABLA: COTIZACION_COMERCIAL
-- ============================================================
CREATE TABLE COTIZACION_COMERCIAL (
    ID              INT         AUTO_INCREMENT PRIMARY KEY,
    version         INT         DEFAULT 1,
    nombre          VARCHAR(150),
    id_solicitud    INT,
    DNI_O_RUC       VARCHAR(20),
    precio_total    DECIMAL(14,2),
    estado          ENUM('aprobado','rechazado por cliente','descartada'),
    comentario_cliente TEXT,
    FOREIGN KEY (id_solicitud) REFERENCES SOLICITUD(ID) ON DELETE SET NULL,
    FOREIGN KEY (DNI_O_RUC) REFERENCES CLIENTE(DNI_O_RUC) ON DELETE SET NULL
);

-- Subtabla: servicios ofrecidos en la cotización
CREATE TABLE COTIZACION_SERVICIO (
    id                  INT         AUTO_INCREMENT PRIMARY KEY,
    ID_Cotizacion       INT         NOT NULL,
    ID_Servicio         INT         NOT NULL,
    fecha_inicio        DATE,
    fecha_finalizacion  DATE,
    jornada             VARCHAR(100),
    precio_comercial    DECIMAL(12,2),
    FOREIGN KEY (ID_Cotizacion) REFERENCES COTIZACION_COMERCIAL(ID) ON DELETE CASCADE,
    FOREIGN KEY (ID_Servicio) REFERENCES SERVICIO(ID_Servicio) ON DELETE CASCADE
);

-- Subtabla: camiones para el servicio
CREATE TABLE COTIZACION_CAMION (
    id                  INT         AUTO_INCREMENT PRIMARY KEY,
    ID_Cotizacion       INT         NOT NULL,
    Placa               VARCHAR(20) NOT NULL,
    uso                 VARCHAR(100),
    fecha_hora_entrada  DATETIME,
    fecha_hora_salida   DATETIME,
    ID_Piloto           INT,        -- FK a USUARIO
    FOREIGN KEY (ID_Cotizacion) REFERENCES COTIZACION_COMERCIAL(ID) ON DELETE CASCADE,
    FOREIGN KEY (Placa) REFERENCES CAMION(Placa) ON DELETE CASCADE,
    FOREIGN KEY (ID_Piloto) REFERENCES USUARIO(idusuario) ON DELETE SET NULL
);

-- Subtabla: inventario disponible en la cotización
CREATE TABLE COTIZACION_INVENTARIO (
    id              INT         AUTO_INCREMENT PRIMARY KEY,
    ID_Cotizacion   INT         NOT NULL,
    ID_Inventario   INT         NOT NULL,
    cantidad        INT,
    intencion       ENUM('comprar','alquilar'),
    dias_alquilados INT,
    precio_comercial DECIMAL(12,2),
    FOREIGN KEY (ID_Cotizacion) REFERENCES COTIZACION_COMERCIAL(ID) ON DELETE CASCADE,
    FOREIGN KEY (ID_Inventario) REFERENCES INVENTARIO(Id_Objeto) ON DELETE CASCADE
);

-- Subtabla: personal en la cotización
CREATE TABLE COTIZACION_PERSONAL (
    id              INT         AUTO_INCREMENT PRIMARY KEY,
    ID_Cotizacion   INT         NOT NULL,
    ID_Usuario      INT         NOT NULL,
    rol_en_trabajo  VARCHAR(100),
    fecha_entrada   DATE,
    fecha_salida    DATE,
    dias_trabajados INT,
    FOREIGN KEY (ID_Cotizacion) REFERENCES COTIZACION_COMERCIAL(ID) ON DELETE CASCADE,
    FOREIGN KEY (ID_Usuario) REFERENCES USUARIO(idusuario) ON DELETE CASCADE
);

-- ============================================================
-- TABLA: PRESUPUESTO_INTERNO
-- ============================================================
CREATE TABLE PRESUPUESTO_INTERNO (
    ID                  INT         AUTO_INCREMENT PRIMARY KEY,
    ID_Cotizacion       INT         NOT NULL,
    costos_indirectos   DECIMAL(12,2),
    coste_total_estimado DECIMAL(14,2),
    FOREIGN KEY (ID_Cotizacion) REFERENCES COTIZACION_COMERCIAL(ID) ON DELETE CASCADE
);

CREATE TABLE PRESUPUESTO_MATERIAL_DIRECTO (
    id              INT         AUTO_INCREMENT PRIMARY KEY,
    ID_Presupuesto  INT         NOT NULL,
    nombre          VARCHAR(150),
    costo           DECIMAL(12,2),
    FOREIGN KEY (ID_Presupuesto) REFERENCES PRESUPUESTO_INTERNO(ID) ON DELETE CASCADE
);

CREATE TABLE PRESUPUESTO_MANO_OBRA (
    id              INT         AUTO_INCREMENT PRIMARY KEY,
    ID_Presupuesto  INT         NOT NULL,
    profesion_ejercida VARCHAR(100),
    costo_x_hora    DECIMAL(10,2),
    costo_general   DECIMAL(12,2),
    FOREIGN KEY (ID_Presupuesto) REFERENCES PRESUPUESTO_INTERNO(ID) ON DELETE CASCADE
);

CREATE TABLE PRESUPUESTO_SERVICIO (
    id              INT         AUTO_INCREMENT PRIMARY KEY,
    ID_Presupuesto  INT         NOT NULL,
    nombre_servicio VARCHAR(150),
    costo           DECIMAL(12,2),
    FOREIGN KEY (ID_Presupuesto) REFERENCES PRESUPUESTO_INTERNO(ID) ON DELETE CASCADE
);

CREATE TABLE PRESUPUESTO_COSTO_INDIRECTO (
    id              INT         AUTO_INCREMENT PRIMARY KEY,
    ID_Presupuesto  INT         NOT NULL,
    nombre_costo    VARCHAR(150),
    costo           DECIMAL(12,2),
    FOREIGN KEY (ID_Presupuesto) REFERENCES PRESUPUESTO_INTERNO(ID) ON DELETE CASCADE
);

CREATE TABLE PRESUPUESTO_GASTO_ADMIN (
    id              INT         AUTO_INCREMENT PRIMARY KEY,
    ID_Presupuesto  INT         NOT NULL,
    nombre_gasto    VARCHAR(150),
    costo           DECIMAL(12,2),
    FOREIGN KEY (ID_Presupuesto) REFERENCES PRESUPUESTO_INTERNO(ID) ON DELETE CASCADE
);

-- ============================================================
-- TABLA: PROYECTO
-- ============================================================
CREATE TABLE PROYECTO (
    id_Proyecto         INT         AUTO_INCREMENT PRIMARY KEY,
    descripcion_servicio TEXT,
    ID_Trabajo          INT,        -- FK a TRABAJO (se agrega al final)
    Id_Cliente          VARCHAR(20),
    ubicacion           VARCHAR(255),
    id_cotizacion       INT,
    orden_servicio      VARCHAR(500),   -- PDF
    informe_final       VARCHAR(500),   -- PDF
    factura             VARCHAR(500),   -- PDF
    fecha_inicio        DATE,
    fecha_fin           DATE,
    observaciones       TEXT,
    estado              ENUM('Pendiente','En Ejecución','Completado','En proceso legal') DEFAULT 'Pendiente',
    FOREIGN KEY (Id_Cliente) REFERENCES CLIENTE(DNI_O_RUC) ON DELETE SET NULL,
    FOREIGN KEY (id_cotizacion) REFERENCES COTIZACION_COMERCIAL(ID) ON DELETE SET NULL
);

-- Subtabla: camiones ingresados al proyecto
CREATE TABLE PROYECTO_CAMION (
    id                  INT         AUTO_INCREMENT PRIMARY KEY,
    id_Proyecto         INT         NOT NULL,
    Placa               VARCHAR(20) NOT NULL,
    personal_manejando  INT,        -- FK a USUARIO
    fecha_hora_entrada  DATETIME,
    fecha_hora_salida   DATETIME,
    FOREIGN KEY (id_Proyecto) REFERENCES PROYECTO(id_Proyecto) ON DELETE CASCADE,
    FOREIGN KEY (Placa) REFERENCES CAMION(Placa) ON DELETE CASCADE,
    FOREIGN KEY (personal_manejando) REFERENCES USUARIO(idusuario) ON DELETE SET NULL
);

-- Subtabla: documentación extra del proyecto
CREATE TABLE PROYECTO_DOCUMENTACION (
    id          INT         AUTO_INCREMENT PRIMARY KEY,
    id_Proyecto INT         NOT NULL,
    pdf_url     VARCHAR(500),
    FOREIGN KEY (id_Proyecto) REFERENCES PROYECTO(id_Proyecto) ON DELETE CASCADE
);

-- Subtabla: inventario del proyecto
CREATE TABLE PROYECTO_INVENTARIO (
    id                  INT         AUTO_INCREMENT PRIMARY KEY,
    id_Proyecto         INT         NOT NULL,
    Id_Objeto           INT         NOT NULL,
    cantidad_objeto     INT,
    estado_post         ENUM('aceptable','robado','averiado','desconocido'),
    fecha_salida        DATE,
    fecha_retorno       DATE,
    metodo_traslado     VARCHAR(100),
    FOREIGN KEY (id_Proyecto) REFERENCES PROYECTO(id_Proyecto) ON DELETE CASCADE,
    FOREIGN KEY (Id_Objeto) REFERENCES INVENTARIO(Id_Objeto) ON DELETE CASCADE
);

-- ============================================================
-- TABLA: TRABAJO
-- ============================================================
CREATE TABLE TRABAJO (
    Id_trabajo      INT         AUTO_INCREMENT PRIMARY KEY,
    Id_Proyecto     INT,
    fecha           DATE,
    horario         VARCHAR(100),
    asistencia      TEXT,
    comentario      TEXT,
    FOREIGN KEY (Id_Proyecto) REFERENCES PROYECTO(id_Proyecto) ON DELETE SET NULL
);

-- Subtabla: jornada de trabajo
CREATE TABLE TRABAJO_JORNADA (
    id                  INT         AUTO_INCREMENT PRIMARY KEY,
    Id_trabajo          INT         NOT NULL,
    DNI_Trabajador      VARCHAR(20) NOT NULL,
    dia                 DATE,
    horario_entrada     TIME,
    horario_salida      TIME,
    FOREIGN KEY (Id_trabajo) REFERENCES TRABAJO(Id_trabajo) ON DELETE CASCADE,
    FOREIGN KEY (DNI_Trabajador) REFERENCES PERFIL(DNI) ON DELETE CASCADE
);

-- Subtabla: RRHH del trabajador en el trabajo
CREATE TABLE TRABAJO_RRHH (
    id              INT         AUTO_INCREMENT PRIMARY KEY,
    Id_trabajo      INT         NOT NULL,
    DNI_Trabajador  VARCHAR(20) NOT NULL,
    estado_pago     ENUM('completado','por realizar','no pagar aun','devolucion pendiente'),
    FOREIGN KEY (Id_trabajo) REFERENCES TRABAJO(Id_trabajo) ON DELETE CASCADE,
    FOREIGN KEY (DNI_Trabajador) REFERENCES PERFIL(DNI) ON DELETE CASCADE
);

-- Subtabla: PDFs de RRHH
CREATE TABLE TRABAJO_RRHH_PDF (
    id              INT         AUTO_INCREMENT PRIMARY KEY,
    ID_RRHH         INT         NOT NULL,
    pdf_url         VARCHAR(500),
    FOREIGN KEY (ID_RRHH) REFERENCES TRABAJO_RRHH(id) ON DELETE CASCADE
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