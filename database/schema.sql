-- Demo local. Base nueva, distinta de operaciones_amg.
-- mysql -u root -e "CREATE DATABASE IF NOT EXISTS distribuidora CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
-- mysql -u root distribuidora < database/schema.sql

SET NAMES utf8mb4;
SET time_zone = '-07:00';

CREATE TABLE IF NOT EXISTS clientes (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  nombre VARCHAR(160) NOT NULL,
  direccion VARCHAR(255) NOT NULL,
  direccion_extra TEXT NULL,
  usuario VARCHAR(160) NULL,
  contrasena VARCHAR(20) NOT NULL DEFAULT '',
  creado_en DATETIME NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_clientes_usuario (usuario)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS pedidos (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  cliente_id INT UNSIGNED NOT NULL,
  fecha_esperada DATE NOT NULL,
  cerrado_por VARCHAR(120) NOT NULL DEFAULT '',
  direccion VARCHAR(255) NULL,
  recibido_en DATETIME NOT NULL,
  procesado TINYINT(1) NOT NULL DEFAULT 0,
  procesado_en DATETIME NULL,
  PRIMARY KEY (id),
  KEY idx_pedidos_recibido (recibido_en),
  CONSTRAINT fk_pedidos_cliente FOREIGN KEY (cliente_id) REFERENCES clientes (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS pedido_lineas (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  pedido_id INT UNSIGNED NOT NULL,
  nombre VARCHAR(160) NOT NULL,
  unidad VARCHAR(40) NOT NULL,
  cantidad DECIMAL(10,2) NOT NULL,
  PRIMARY KEY (id),
  KEY idx_lineas_pedido (pedido_id),
  CONSTRAINT fk_lineas_pedido FOREIGN KEY (pedido_id) REFERENCES pedidos (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
