DROP DATABASE IF EXISTS iot_cars;
CREATE DATABASE iot_cars
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE iot_cars;

CREATE TABLE parametros (
    id_parametro    INT NOT NULL AUTO_INCREMENT,
    nombre          VARCHAR(60) NOT NULL,
    velocidad       TINYINT UNSIGNED NOT NULL DEFAULT 255,
    factor_vuelta   DECIMAL(6,4) NOT NULL DEFAULT 0.7500,
    factor_tiempo   DECIMAL(8,4) NOT NULL DEFAULT 500.0000,
    factor_giro_90  DECIMAL(8,4) NOT NULL DEFAULT 1.0000,
    activo          TINYINT(1) NOT NULL DEFAULT 1,
    fecha_registro  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_update    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT pk_parametros PRIMARY KEY (id_parametro)
) ENGINE=InnoDB;

INSERT INTO parametros (nombre, velocidad, factor_vuelta, factor_tiempo, factor_giro_90)
VALUES ('Configuración default', 255, 0.75, 500.0, 1.0);

CREATE TABLE catalogo_movimientos (
    id_movimiento INT NOT NULL AUTO_INCREMENT,
    clave         VARCHAR(40) NOT NULL UNIQUE,
    descripcion   VARCHAR(100) NOT NULL,
    categoria     ENUM('LINEAL','VUELTA','GIRO','PARADA') NOT NULL DEFAULT 'LINEAL',
    activo        TINYINT(1) NOT NULL DEFAULT 1,
    CONSTRAINT pk_catalogo_movimientos PRIMARY KEY (id_movimiento)
) ENGINE=InnoDB;

INSERT INTO catalogo_movimientos (clave, descripcion, categoria) VALUES
('ADELANTE',            'Adelante',                  'LINEAL'),
('ATRAS',               'Atrás',                     'LINEAL'),
('VUELTA_ADELANTE_DER', 'Vuelta adelante derecha',   'VUELTA'),
('VUELTA_ADELANTE_IZQ', 'Vuelta adelante izquierda', 'VUELTA'),
('VUELTA_ATRAS_DER',    'Vuelta atrás derecha',      'VUELTA'),
('VUELTA_ATRAS_IZQ',    'Vuelta atrás izquierda',    'VUELTA'),
('GIRO_90_IZQ',         'Giro 90° izquierda',        'GIRO'),
('GIRO_90_DER',         'Giro 90° derecha',          'GIRO'),
('GIRO_360_IZQ',        'Giro 360° izquierda',       'GIRO'),
('GIRO_360_DER',        'Giro 360° derecha',         'GIRO'),
('PARADA',              'Parada',                    'PARADA');

CREATE TABLE motores (
    id_motor       INT NOT NULL AUTO_INCREMENT,
    id_parametro   INT NOT NULL,
    id_movimiento  INT NOT NULL,
    mi_velocidad   SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    mi_direccion   ENUM('ADELANTE','ATRAS','STOP') NOT NULL DEFAULT 'STOP',
    mi_time        DECIMAL(10,4) NOT NULL DEFAULT 0,
    md_velocidad   SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    md_direccion   ENUM('ADELANTE','ATRAS','STOP') NOT NULL DEFAULT 'STOP',
    md_time        DECIMAL(10,4) NOT NULL DEFAULT 0,
    fecha_registro DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_update   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT pk_motores PRIMARY KEY (id_motor),
    CONSTRAINT fk_mot_parametro FOREIGN KEY (id_parametro)
        REFERENCES parametros(id_parametro),
    CONSTRAINT fk_mot_movimiento FOREIGN KEY (id_movimiento)
        REFERENCES catalogo_movimientos(id_movimiento),
    CONSTRAINT uq_param_mov UNIQUE (id_parametro, id_movimiento)
) ENGINE=InnoDB;

CREATE TABLE dispositivos (
    id_dispositivo INT NOT NULL AUTO_INCREMENT,
    nombre         VARCHAR(80) NOT NULL,
    mac_address    VARCHAR(17) NULL UNIQUE,
    token          VARCHAR(64) NOT NULL UNIQUE,
    activo         TINYINT(1) NOT NULL DEFAULT 1,
    fecha_registro DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_dispositivos PRIMARY KEY (id_dispositivo)
) ENGINE=InnoDB;

CREATE TABLE log_conexiones (
    id_conexion    BIGINT NOT NULL AUTO_INCREMENT,
    id_dispositivo INT NOT NULL,
    ip             VARCHAR(45) NOT NULL,
    pais           VARCHAR(60) NULL,
    ciudad         VARCHAR(80) NULL,
    latitud        DECIMAL(10,7) NULL,
    longitud       DECIMAL(10,7) NULL,
    operacion      VARCHAR(80) NOT NULL,
    fecha_evento   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_log_conexiones PRIMARY KEY (id_conexion),
    CONSTRAINT fk_log_dispositivo FOREIGN KEY (id_dispositivo)
        REFERENCES dispositivos(id_dispositivo)
) ENGINE=InnoDB;

CREATE INDEX idx_logcon_disp_fecha ON log_conexiones (id_dispositivo, fecha_evento DESC);

CREATE TABLE estatus_movimiento (
    id_estatus     BIGINT NOT NULL AUTO_INCREMENT,
    id_dispositivo INT NOT NULL,
    id_movimiento  INT NOT NULL,
    origen         ENUM('MANUAL','DEMO','API') NOT NULL DEFAULT 'MANUAL',
    fecha_hora     DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    CONSTRAINT pk_estatus_mov PRIMARY KEY (id_estatus),
    CONSTRAINT fk_em_dispositivo FOREIGN KEY (id_dispositivo)
        REFERENCES dispositivos(id_dispositivo),
    CONSTRAINT fk_em_movimiento FOREIGN KEY (id_movimiento)
        REFERENCES catalogo_movimientos(id_movimiento)
) ENGINE=InnoDB;

CREATE INDEX idx_em_disp_fecha ON estatus_movimiento (id_dispositivo, fecha_hora DESC);

CREATE TABLE estatus_obstaculo (
    id_obstaculo   BIGINT NOT NULL AUTO_INCREMENT,
    id_dispositivo INT NOT NULL,
    distancia_cm   DECIMAL(6,2) NULL,
    accion_tomada  VARCHAR(80) NULL,
    fecha_hora     DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    CONSTRAINT pk_estatus_obs PRIMARY KEY (id_obstaculo),
    CONSTRAINT fk_eo_dispositivo FOREIGN KEY (id_dispositivo)
        REFERENCES dispositivos(id_dispositivo)
) ENGINE=InnoDB;

CREATE INDEX idx_eo_disp_fecha ON estatus_obstaculo (id_dispositivo, fecha_hora DESC);

CREATE TABLE demos (
    id_demo        INT NOT NULL AUTO_INCREMENT,
    nombre         VARCHAR(80) NOT NULL,
    descripcion    TEXT NULL,
    id_dispositivo INT NOT NULL,
    activo         TINYINT(1) NOT NULL DEFAULT 1,
    fecha_registro DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_demos PRIMARY KEY (id_demo),
    CONSTRAINT fk_demo_dispositivo FOREIGN KEY (id_dispositivo)
        REFERENCES dispositivos(id_dispositivo)
) ENGINE=InnoDB;

CREATE TABLE demo_movimientos (
    id_demo_mov   INT NOT NULL AUTO_INCREMENT,
    id_demo       INT NOT NULL,
    orden         SMALLINT NOT NULL,
    id_movimiento INT NOT NULL,
    duracion_ms   INT NULL,
    CONSTRAINT pk_demo_movimientos PRIMARY KEY (id_demo_mov),
    CONSTRAINT fk_dm_demo FOREIGN KEY (id_demo)
        REFERENCES demos(id_demo) ON DELETE CASCADE,
    CONSTRAINT fk_dm_movimiento FOREIGN KEY (id_movimiento)
        REFERENCES catalogo_movimientos(id_movimiento),
    CONSTRAINT uq_demo_orden UNIQUE (id_demo, orden)
) ENGINE=InnoDB;

CREATE TABLE log_demo_ejecuciones (
    id_ejecucion   BIGINT NOT NULL AUTO_INCREMENT,
    id_demo        INT NOT NULL,
    id_dispositivo INT NOT NULL,
    fecha_inicio   DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    fecha_fin      DATETIME(3) NULL,
    resultado      ENUM('OK','ERROR','INTERRUMPIDA') NOT NULL DEFAULT 'OK',
    CONSTRAINT pk_log_demo PRIMARY KEY (id_ejecucion),
    CONSTRAINT fk_lde_demo FOREIGN KEY (id_demo)
        REFERENCES demos(id_demo),
    CONSTRAINT fk_lde_dispositivo FOREIGN KEY (id_dispositivo)
        REFERENCES dispositivos(id_dispositivo)
) ENGINE=InnoDB;

DELIMITER $$

CREATE PROCEDURE sp_recalcular_motores (IN p_id_parametro INT)
BEGIN
    DECLARE v_velocidad     TINYINT UNSIGNED;
    DECLARE v_factor_vuelta DECIMAL(6,4);
    DECLARE v_factor_tiempo DECIMAL(8,4);
    DECLARE v_factor_giro90 DECIMAL(8,4);
    DECLARE v_vel_apoyo     DECIMAL(8,4);
    DECLARE v_tiempo_90     DECIMAL(10,4);
    DECLARE v_tiempo_360    DECIMAL(10,4);

    SELECT velocidad, factor_vuelta, factor_tiempo, factor_giro_90
    INTO v_velocidad, v_factor_vuelta, v_factor_tiempo, v_factor_giro90
    FROM parametros
    WHERE id_parametro = p_id_parametro AND activo = 1;

    IF v_velocidad IS NULL THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Parámetro no encontrado o inactivo';
    END IF;

    SET v_vel_apoyo  = ROUND(v_velocidad * v_factor_vuelta);
    SET v_tiempo_90  = v_factor_tiempo * v_factor_giro90;
    SET v_tiempo_360 = v_factor_tiempo * v_factor_giro90 * 4;

    INSERT INTO motores (id_parametro, id_movimiento, mi_velocidad, mi_direccion, mi_time, md_velocidad, md_direccion, md_time)
    SELECT p_id_parametro, id_movimiento, v_velocidad, 'ADELANTE', v_factor_tiempo, v_velocidad, 'ADELANTE', v_factor_tiempo
    FROM catalogo_movimientos WHERE clave = 'ADELANTE'
    ON DUPLICATE KEY UPDATE
        mi_velocidad = v_velocidad, mi_direccion = 'ADELANTE', mi_time = v_factor_tiempo,
        md_velocidad = v_velocidad, md_direccion = 'ADELANTE', md_time = v_factor_tiempo,
        fecha_update = NOW();

    INSERT INTO motores (id_parametro, id_movimiento, mi_velocidad, mi_direccion, mi_time, md_velocidad, md_direccion, md_time)
    SELECT p_id_parametro, id_movimiento, v_velocidad, 'ATRAS', v_factor_tiempo, v_velocidad, 'ATRAS', v_factor_tiempo
    FROM catalogo_movimientos WHERE clave = 'ATRAS'
    ON DUPLICATE KEY UPDATE
        mi_velocidad = v_velocidad, mi_direccion = 'ATRAS', mi_time = v_factor_tiempo,
        md_velocidad = v_velocidad, md_direccion = 'ATRAS', md_time = v_factor_tiempo,
        fecha_update = NOW();

    INSERT INTO motores (id_parametro, id_movimiento, mi_velocidad, mi_direccion, mi_time, md_velocidad, md_direccion, md_time)
    SELECT p_id_parametro, id_movimiento, v_velocidad, 'ADELANTE', v_factor_tiempo, v_vel_apoyo, 'ADELANTE', v_factor_tiempo
    FROM catalogo_movimientos WHERE clave = 'VUELTA_ADELANTE_DER'
    ON DUPLICATE KEY UPDATE
        mi_velocidad = v_velocidad, mi_direccion = 'ADELANTE', mi_time = v_factor_tiempo,
        md_velocidad = v_vel_apoyo, md_direccion = 'ADELANTE', md_time = v_factor_tiempo,
        fecha_update = NOW();

    INSERT INTO motores (id_parametro, id_movimiento, mi_velocidad, mi_direccion, mi_time, md_velocidad, md_direccion, md_time)
    SELECT p_id_parametro, id_movimiento, v_vel_apoyo, 'ADELANTE', v_factor_tiempo, v_velocidad, 'ADELANTE', v_factor_tiempo
    FROM catalogo_movimientos WHERE clave = 'VUELTA_ADELANTE_IZQ'
    ON DUPLICATE KEY UPDATE
        mi_velocidad = v_vel_apoyo, mi_direccion = 'ADELANTE', mi_time = v_factor_tiempo,
        md_velocidad = v_velocidad, md_direccion = 'ADELANTE', md_time = v_factor_tiempo,
        fecha_update = NOW();

    INSERT INTO motores (id_parametro, id_movimiento, mi_velocidad, mi_direccion, mi_time, md_velocidad, md_direccion, md_time)
    SELECT p_id_parametro, id_movimiento, v_velocidad, 'ATRAS', v_factor_tiempo, v_vel_apoyo, 'ATRAS', v_factor_tiempo
    FROM catalogo_movimientos WHERE clave = 'VUELTA_ATRAS_DER'
    ON DUPLICATE KEY UPDATE
        mi_velocidad = v_velocidad, mi_direccion = 'ATRAS', mi_time = v_factor_tiempo,
        md_velocidad = v_vel_apoyo, md_direccion = 'ATRAS', md_time = v_factor_tiempo,
        fecha_update = NOW();

    INSERT INTO motores (id_parametro, id_movimiento, mi_velocidad, mi_direccion, mi_time, md_velocidad, md_direccion, md_time)
    SELECT p_id_parametro, id_movimiento, v_vel_apoyo, 'ATRAS', v_factor_tiempo, v_velocidad, 'ATRAS', v_factor_tiempo
    FROM catalogo_movimientos WHERE clave = 'VUELTA_ATRAS_IZQ'
    ON DUPLICATE KEY UPDATE
        mi_velocidad = v_vel_apoyo, mi_direccion = 'ATRAS', mi_time = v_factor_tiempo,
        md_velocidad = v_velocidad, md_direccion = 'ATRAS', md_time = v_factor_tiempo,
        fecha_update = NOW();

    INSERT INTO motores (id_parametro, id_movimiento, mi_velocidad, mi_direccion, mi_time, md_velocidad, md_direccion, md_time)
    SELECT p_id_parametro, id_movimiento, v_velocidad, 'ATRAS', v_tiempo_90, v_velocidad, 'ADELANTE', v_tiempo_90
    FROM catalogo_movimientos WHERE clave = 'GIRO_90_IZQ'
    ON DUPLICATE KEY UPDATE
        mi_velocidad = v_velocidad, mi_direccion = 'ATRAS', mi_time = v_tiempo_90,
        md_velocidad = v_velocidad, md_direccion = 'ADELANTE', md_time = v_tiempo_90,
        fecha_update = NOW();

    INSERT INTO motores (id_parametro, id_movimiento, mi_velocidad, mi_direccion, mi_time, md_velocidad, md_direccion, md_time)
    SELECT p_id_parametro, id_movimiento, v_velocidad, 'ADELANTE', v_tiempo_90, v_velocidad, 'ATRAS', v_tiempo_90
    FROM catalogo_movimientos WHERE clave = 'GIRO_90_DER'
    ON DUPLICATE KEY UPDATE
        mi_velocidad = v_velocidad, mi_direccion = 'ADELANTE', mi_time = v_tiempo_90,
        md_velocidad = v_velocidad, md_direccion = 'ATRAS', md_time = v_tiempo_90,
        fecha_update = NOW();

    INSERT INTO motores (id_parametro, id_movimiento, mi_velocidad, mi_direccion, mi_time, md_velocidad, md_direccion, md_time)
    SELECT p_id_parametro, id_movimiento, v_velocidad, 'ATRAS', v_tiempo_360, v_velocidad, 'ADELANTE', v_tiempo_360
    FROM catalogo_movimientos WHERE clave = 'GIRO_360_IZQ'
    ON DUPLICATE KEY UPDATE
        mi_velocidad = v_velocidad, mi_direccion = 'ATRAS', mi_time = v_tiempo_360,
        md_velocidad = v_velocidad, md_direccion = 'ADELANTE', md_time = v_tiempo_360,
        fecha_update = NOW();

    INSERT INTO motores (id_parametro, id_movimiento, mi_velocidad, mi_direccion, mi_time, md_velocidad, md_direccion, md_time)
    SELECT p_id_parametro, id_movimiento, v_velocidad, 'ADELANTE', v_tiempo_360, v_velocidad, 'ATRAS', v_tiempo_360
    FROM catalogo_movimientos WHERE clave = 'GIRO_360_DER'
    ON DUPLICATE KEY UPDATE
        mi_velocidad = v_velocidad, mi_direccion = 'ADELANTE', mi_time = v_tiempo_360,
        md_velocidad = v_velocidad, md_direccion = 'ATRAS', md_time = v_tiempo_360,
        fecha_update = NOW();

    INSERT INTO motores (id_parametro, id_movimiento, mi_velocidad, mi_direccion, mi_time, md_velocidad, md_direccion, md_time)
    SELECT p_id_parametro, id_movimiento, 0, 'STOP', 0, 0, 'STOP', 0
    FROM catalogo_movimientos WHERE clave = 'PARADA'
    ON DUPLICATE KEY UPDATE
        mi_velocidad = 0, mi_direccion = 'STOP', mi_time = 0,
        md_velocidad = 0, md_direccion = 'STOP', md_time = 0,
        fecha_update = NOW();

    SELECT 'Tabla motores recalculada correctamente' AS mensaje;
END$$

CREATE PROCEDURE sp_actualizar_parametros (
    IN p_id_parametro  INT,
    IN p_velocidad     TINYINT UNSIGNED,
    IN p_factor_vuelta DECIMAL(6,4),
    IN p_factor_tiempo DECIMAL(8,4),
    IN p_factor_giro90 DECIMAL(8,4)
)
BEGIN
    UPDATE parametros
    SET velocidad = p_velocidad,
        factor_vuelta = p_factor_vuelta,
        factor_tiempo = p_factor_tiempo,
        factor_giro_90 = p_factor_giro90
    WHERE id_parametro = p_id_parametro;

    IF ROW_COUNT() = 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Parámetro no encontrado';
    END IF;

    CALL sp_recalcular_motores(p_id_parametro);
END$$

CREATE PROCEDURE sp_registrar_dispositivo (
    IN  p_nombre VARCHAR(80),
    IN  p_mac_address VARCHAR(17),
    OUT p_id_dispositivo INT,
    OUT p_token VARCHAR(64)
)
BEGIN
    SET p_token = SHA2(CONCAT(p_nombre, p_mac_address, NOW(), RAND()), 256);

    INSERT INTO dispositivos (nombre, mac_address, token)
    VALUES (p_nombre, p_mac_address, p_token);

    SET p_id_dispositivo = LAST_INSERT_ID();

    SELECT p_id_dispositivo AS id_dispositivo, p_token AS token;
END$$

CREATE PROCEDURE sp_log_conexion (
    IN p_id_dispositivo INT,
    IN p_ip VARCHAR(45),
    IN p_pais VARCHAR(60),
    IN p_ciudad VARCHAR(80),
    IN p_latitud DECIMAL(10,7),
    IN p_longitud DECIMAL(10,7),
    IN p_operacion VARCHAR(80)
)
BEGIN
    INSERT INTO log_conexiones
        (id_dispositivo, ip, pais, ciudad, latitud, longitud, operacion)
    VALUES
        (p_id_dispositivo, p_ip, p_pais, p_ciudad, p_latitud, p_longitud, p_operacion);

    SELECT LAST_INSERT_ID() AS id_conexion;
END$$

CREATE PROCEDURE sp_agregar_movimiento (
    IN p_id_dispositivo INT,
    IN p_id_movimiento INT,
    IN p_origen ENUM('MANUAL','DEMO','API')
)
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM catalogo_movimientos
        WHERE id_movimiento = p_id_movimiento AND activo = 1
    ) THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Movimiento no encontrado';
    END IF;

    INSERT INTO estatus_movimiento (id_dispositivo, id_movimiento, origen)
    VALUES (p_id_dispositivo, p_id_movimiento, p_origen);

    SELECT LAST_INSERT_ID() AS id_estatus, NOW(3) AS fecha_hora;
END$$

CREATE PROCEDURE sp_ultimo_movimiento (
    IN p_id_dispositivo INT,
    IN p_id_parametro INT
)
BEGIN
    SELECT
        cm.clave AS movimiento_clave,
        cm.descripcion AS movimiento,
        em.origen,
        COALESCE(mot.mi_velocidad, 0) AS mi_velocidad,
        COALESCE(mot.mi_direccion, 'STOP') AS mi_direccion,
        COALESCE(mot.mi_time, 0) AS mi_time,
        COALESCE(mot.md_velocidad, 0) AS md_velocidad,
        COALESCE(mot.md_direccion, 'STOP') AS md_direccion,
        COALESCE(mot.md_time, 0) AS md_time,
        em.fecha_hora
    FROM estatus_movimiento em
    INNER JOIN catalogo_movimientos cm ON cm.id_movimiento = em.id_movimiento
    LEFT JOIN motores mot ON mot.id_movimiento = em.id_movimiento
        AND mot.id_parametro = p_id_parametro
    WHERE em.id_dispositivo = p_id_dispositivo
    ORDER BY em.fecha_hora DESC
    LIMIT 1;
END$$

CREATE PROCEDURE sp_ultimos_10_movimientos (
    IN p_id_dispositivo INT
)
BEGIN
    SELECT
        em.id_estatus,
        cm.clave AS movimiento_clave,
        cm.descripcion AS movimiento,
        cm.categoria,
        em.origen,
        em.fecha_hora
    FROM estatus_movimiento em
    INNER JOIN catalogo_movimientos cm ON cm.id_movimiento = em.id_movimiento
    WHERE em.id_dispositivo = p_id_dispositivo
    ORDER BY em.fecha_hora DESC
    LIMIT 10;
END$$

CREATE PROCEDURE sp_agregar_obstaculo (
    IN p_id_dispositivo INT,
    IN p_distancia_cm DECIMAL(6,2),
    IN p_accion_tomada VARCHAR(80)
)
BEGIN
    INSERT INTO estatus_obstaculo (id_dispositivo, distancia_cm, accion_tomada)
    VALUES (p_id_dispositivo, p_distancia_cm, p_accion_tomada);

    SELECT LAST_INSERT_ID() AS id_obstaculo, NOW(3) AS fecha_hora;
END$$

CREATE PROCEDURE sp_ultimo_obstaculo (
    IN p_id_dispositivo INT
)
BEGIN
    SELECT id_obstaculo, distancia_cm, accion_tomada, fecha_hora
    FROM estatus_obstaculo
    WHERE id_dispositivo = p_id_dispositivo
    ORDER BY fecha_hora DESC
    LIMIT 1;
END$$

CREATE PROCEDURE sp_ultimos_10_obstaculos (
    IN p_id_dispositivo INT
)
BEGIN
    SELECT id_obstaculo, distancia_cm, accion_tomada, fecha_hora
    FROM estatus_obstaculo
    WHERE id_dispositivo = p_id_dispositivo
    ORDER BY fecha_hora DESC
    LIMIT 10;
END$$

CREATE PROCEDURE sp_crear_demo (
    IN p_nombre VARCHAR(80),
    IN p_descripcion TEXT,
    IN p_id_dispositivo INT,
    IN p_movimientos JSON
)
BEGIN
    DECLARE v_id_demo INT;
    DECLARE v_i INT DEFAULT 0;
    DECLARE v_n INT;
    DECLARE v_clave VARCHAR(40);
    DECLARE v_id_mov INT;

    INSERT INTO demos (nombre, descripcion, id_dispositivo)
    VALUES (p_nombre, p_descripcion, p_id_dispositivo);

    SET v_id_demo = LAST_INSERT_ID();
    SET v_n = JSON_LENGTH(p_movimientos);

    WHILE v_i < v_n DO
        SET v_clave = JSON_UNQUOTE(JSON_EXTRACT(p_movimientos, CONCAT('$[', v_i, ']')));

        SET v_id_mov = NULL;

        SELECT id_movimiento INTO v_id_mov
        FROM catalogo_movimientos
        WHERE clave = v_clave AND activo = 1
        LIMIT 1;

        IF v_id_mov IS NULL THEN
            SIGNAL SQLSTATE '45000'
                SET MESSAGE_TEXT = 'Movimiento de DEMO no encontrado en catálogo';
        END IF;

        INSERT INTO demo_movimientos (id_demo, orden, id_movimiento)
        VALUES (v_id_demo, v_i + 1, v_id_mov);

        SET v_i = v_i + 1;
    END WHILE;

    SELECT v_id_demo AS id_demo, v_n AS total_movimientos;
END$$

CREATE PROCEDURE sp_visualizar_demo (
    IN p_id_demo INT
)
BEGIN
    SELECT d.id_demo, d.nombre, d.descripcion, d.fecha_registro
    FROM demos d
    WHERE d.id_demo = p_id_demo;

    SELECT
        dm.orden,
        cm.clave AS movimiento_clave,
        cm.descripcion AS movimiento,
        cm.categoria,
        dm.duracion_ms
    FROM demo_movimientos dm
    INNER JOIN catalogo_movimientos cm ON cm.id_movimiento = dm.id_movimiento
    WHERE dm.id_demo = p_id_demo
    ORDER BY dm.orden;
END$$

CREATE PROCEDURE sp_ultimas_demos (
    IN p_id_dispositivo INT,
    IN p_limite INT
)
BEGIN
    SET p_limite = IFNULL(p_limite, 10);

    SELECT
        d.id_demo,
        d.nombre,
        d.descripcion,
        COUNT(dm.id_demo_mov) AS total_movimientos,
        d.fecha_registro
    FROM demos d
    LEFT JOIN demo_movimientos dm ON dm.id_demo = d.id_demo
    WHERE d.id_dispositivo = p_id_dispositivo
    GROUP BY d.id_demo, d.nombre, d.descripcion, d.fecha_registro
    ORDER BY d.fecha_registro DESC
    LIMIT p_limite;
END$$

CREATE PROCEDURE sp_repetir_demo (
    IN p_id_demo INT,
    IN p_id_dispositivo INT
)
BEGIN
    DECLARE v_id_ejecucion BIGINT;
    DECLARE v_id_movimiento INT;
    DECLARE v_done INT DEFAULT 0;

    DECLARE cur_movs CURSOR FOR
        SELECT id_movimiento
        FROM demo_movimientos
        WHERE id_demo = p_id_demo
        ORDER BY orden;

    DECLARE CONTINUE HANDLER FOR NOT FOUND SET v_done = 1;

    INSERT INTO log_demo_ejecuciones (id_demo, id_dispositivo)
    VALUES (p_id_demo, p_id_dispositivo);

    SET v_id_ejecucion = LAST_INSERT_ID();

    OPEN cur_movs;

    loop_movs: LOOP
        FETCH cur_movs INTO v_id_movimiento;

        IF v_done THEN
            LEAVE loop_movs;
        END IF;

        INSERT INTO estatus_movimiento (id_dispositivo, id_movimiento, origen)
        VALUES (p_id_dispositivo, v_id_movimiento, 'DEMO');
    END LOOP;

    CLOSE cur_movs;

    UPDATE log_demo_ejecuciones
    SET fecha_fin = NOW(3), resultado = 'OK'
    WHERE id_ejecucion = v_id_ejecucion;

    SELECT v_id_ejecucion AS id_ejecucion, NOW(3) AS fecha_fin;
END$$

DELIMITER ;

CALL sp_recalcular_motores(1);

CREATE VIEW v_motores_detalle AS
SELECT
    p.nombre AS parametro,
    cm.clave AS movimiento_clave,
    cm.descripcion AS movimiento,
    cm.categoria,
    mot.mi_velocidad,
    mot.mi_direccion,
    ROUND(mot.mi_time, 2) AS mi_time_ms,
    mot.md_velocidad,
    mot.md_direccion,
    ROUND(mot.md_time, 2) AS md_time_ms,
    mot.fecha_update
FROM motores mot
INNER JOIN parametros p ON p.id_parametro = mot.id_parametro
INNER JOIN catalogo_movimientos cm ON cm.id_movimiento = mot.id_movimiento
ORDER BY p.id_parametro, cm.id_movimiento;

CALL sp_registrar_dispositivo('Carrito-01', 'AA:BB:CC:DD:EE:FF', @id, @token);
SELECT @id, @token;

CALL sp_agregar_movimiento(1, 1, 'MANUAL'); -- ADELANTE
CALL sp_agregar_movimiento(1, 5, 'MANUAL'); -- VUELTA_ATRAS_DER
CALL sp_agregar_movimiento(1, 7, 'MANUAL'); -- GIRO_90_IZQ

CALL sp_ultimo_movimiento(1, 1);

UPDATE motores mot
INNER JOIN catalogo_movimientos cm
    ON cm.id_movimiento = mot.id_movimiento
SET
    mot.mi_direccion = CASE
        WHEN cm.clave = 'GIRO_90_IZQ' THEN 'ADELANTE'
        WHEN cm.clave = 'GIRO_90_DER' THEN 'ATRAS'
    END,
    mot.md_direccion = CASE
        WHEN cm.clave = 'GIRO_90_IZQ' THEN 'ATRAS'
        WHEN cm.clave = 'GIRO_90_DER' THEN 'ADELANTE'
    END
WHERE cm.clave IN ('GIRO_90_IZQ', 'GIRO_90_DER')
  AND mot.id_parametro = 1;