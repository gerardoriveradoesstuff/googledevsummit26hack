-- Borra todas las cuentas de la distribuidora y los pedidos que dependen de ellas.
-- Correrlo en la base distribuidora.

USE distribuidora;

DELETE pl
FROM pedido_lineas pl
INNER JOIN pedidos p ON p.id = pl.pedido_id;

DELETE FROM pedidos;

DELETE FROM clientes;

ALTER TABLE pedido_lineas AUTO_INCREMENT = 1;
ALTER TABLE pedidos AUTO_INCREMENT = 1;
ALTER TABLE clientes AUTO_INCREMENT = 1;
