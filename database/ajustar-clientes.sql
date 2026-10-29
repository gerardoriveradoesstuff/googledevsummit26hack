-- Ajusta la tabla que ya existe.
-- Queda: id, nombre, direccion, usuario, contrasena, creado_en.

USE distribuidora;

ALTER TABLE clientes
  ADD COLUMN usuario VARCHAR(160) NULL AFTER direccion,
  ADD COLUMN contrasena VARCHAR(20) NOT NULL DEFAULT '' AFTER usuario,
  ADD UNIQUE KEY uq_clientes_usuario (usuario);

ALTER TABLE clientes
  DROP COLUMN llave;
