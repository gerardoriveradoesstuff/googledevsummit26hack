-- Datos demo para Distribuidora de Productos. GENERADO por database/generar_seed.py; no editar a mano.
-- Aplicar DESPUÉS de schema.sql:
--   mysql -u root distribuidora < database/seed.sql
-- Idempotente: primero borra solo las cuentas demo (por usuario) con sus pedidos y líneas,
-- luego las vuelve a crear. Cuentas creadas a mano desde el panel no se tocan.
-- Fechas relativas a hoy (CURDATE()/NOW() en -07:00) para que el inbox siempre se vea al día.
-- 10 clientes, 55 pedidos, 338 líneas.

SET NAMES utf8mb4;
SET time_zone = '-07:00';

-- 1. Borrar demo previo (hijos primero por las llaves foráneas).
DELETE pl FROM pedido_lineas pl JOIN pedidos p ON p.id = pl.pedido_id JOIN clientes c ON c.id = p.cliente_id
  WHERE c.usuario IN ('armegr', 'talapa', 'maelgu', 'cooagu', 'pusami', 'talopr', 'phsaki', 'grfoca', 'sademi', 'elfaco');
DELETE p FROM pedidos p JOIN clientes c ON c.id = p.cliente_id WHERE c.usuario IN ('armegr', 'talapa', 'maelgu', 'cooagu', 'pusami', 'talopr', 'phsaki', 'grfoca', 'sademi', 'elfaco');
DELETE FROM clientes WHERE usuario IN ('armegr', 'talapa', 'maelgu', 'cooagu', 'pusami', 'talopr', 'phsaki', 'grfoca', 'sademi', 'elfaco');

-- Reinicia contadores (MySQL/MariaDB los suben solos a MAX(id)+1 si quedan filas).
ALTER TABLE pedido_lineas AUTO_INCREMENT = 1;
ALTER TABLE pedidos AUTO_INCREMENT = 1;
ALTER TABLE clientes AUTO_INCREMENT = 1;

START TRANSACTION;
-- 2. Clientes.
INSERT INTO clientes (nombre, direccion, direccion_extra, usuario, contrasena, creado_en) VALUES
  ('Araujos Mexican Grill', '2125 Story Rd, San Jose, CA 95122', 'Entrega por la puerta de cocina, atrás
Recibe: Don Chuy', 'armegr', '7KM', TIMESTAMP(CURDATE() - INTERVAL 45 DAY, '10:00:00')),
  ('Taquería La Palma', '2884 24th St, San Francisco, CA 94110', 'Zona de carga en Bryant St antes de las 9 am', 'talapa', '4RT', TIMESTAMP(CURDATE() - INTERVAL 44 DAY, '10:00:00')),
  ('Mariscos El Güero', '2427 E Cesar E Chavez Ave, Los Angeles, CA 90033', 'Llamar al llegar: (323) 555-0142', 'maelgu', '9HX', TIMESTAMP(CURDATE() - INTERVAL 43 DAY, '10:00:00')),
  ('Cocina Oaxaqueña Guelaguetza', '3014 W Olympic Blvd, Los Angeles, CA 90006', 'Bodega por el callejón', 'cooagu', '3PN', TIMESTAMP(CURDATE() - INTERVAL 42 DAY, '10:00:00')),
  ('Pupusería San Miguel', '2632 Middlefield Rd, Redwood City, CA 94063', NULL, 'pusami', '6WD', TIMESTAMP(CURDATE() - INTERVAL 41 DAY, '10:00:00')),
  ('Tacos Los Primos', '1950 University Ave, East Palo Alto, CA 94303', 'Truck estacionado atrás del local después de las 11 am', 'talopr', '5BJ', TIMESTAMP(CURDATE() - INTERVAL 40 DAY, '10:00:00')),
  ('Pho Saigon Kitchen', '1688 Tully Rd, San Jose, CA 95122', 'Recibe: Mr. Tran', 'phsaki', '8ZQ', TIMESTAMP(CURDATE() - INTERVAL 39 DAY, '10:00:00')),
  ('Green Fork Café', '2190 Shattuck Ave, Berkeley, CA 94704', 'Factura a nombre de Green Fork LLC', 'grfoca', '2LV', TIMESTAMP(CURDATE() - INTERVAL 38 DAY, '10:00:00')),
  ('Sabor de Michoacán', '411 W 4th St, Santa Ana, CA 92701', NULL, 'sademi', '3YC', TIMESTAMP(CURDATE() - INTERVAL 37 DAY, '10:00:00')),
  ('El Farolito Cocina', '4817 International Blvd, Oakland, CA 94601', 'Cerrado los lunes', 'elfaco', '7GF', TIMESTAMP(CURDATE() - INTERVAL 36 DAY, '10:00:00'));

-- 3. Pedidos y líneas (en orden de llegada, así el número crece con el tiempo).
INSERT INTO pedidos (cliente_id, fecha_esperada, cerrado_por, direccion, recibido_en, procesado, procesado_en) SELECT id, CURDATE() - INTERVAL 21 DAY, 'Marco', NULL, TIMESTAMP(CURDATE() - INTERVAL 22 DAY, '17:34:00'), 1, LEAST(TIMESTAMP(CURDATE() - INTERVAL 21 DAY, '05:50:00'), NOW() - INTERVAL 5 MINUTE) FROM clientes WHERE usuario = 'armegr';
SET @p = LAST_INSERT_ID();
INSERT INTO pedido_lineas (pedido_id, nombre, unidad, cantidad) VALUES (@p, 'Serrano', 'lb', 7.50), (@p, 'Rábano', 'lb', 5.50), (@p, 'Cebolla blanca', 'caja', 4.50), (@p, 'Aguacate', 'caja', 5.00), (@p, 'Lechuga romana', 'caja', 1.00), (@p, 'Tomatillo', 'lb', 15.00), (@p, 'Limón', 'caja', 1.50), (@p, 'Jalapeño', 'lb', 7.50);
INSERT INTO pedidos (cliente_id, fecha_esperada, cerrado_por, direccion, recibido_en, procesado, procesado_en) SELECT id, CURDATE() - INTERVAL 20 DAY, 'Lupita', NULL, TIMESTAMP(CURDATE() - INTERVAL 20 DAY, '08:44:00'), 1, LEAST(TIMESTAMP(CURDATE() - INTERVAL 20 DAY, '10:44:00'), NOW() - INTERVAL 5 MINUTE) FROM clientes WHERE usuario = 'armegr';
SET @p = LAST_INSERT_ID();
INSERT INTO pedido_lineas (pedido_id, nombre, unidad, cantidad) VALUES (@p, 'Limón', 'caja', 3.50), (@p, 'Papa', 'kg', 17.50), (@p, 'Tomatillo', 'lb', 12.50), (@p, 'Cilantro', 'caja', 0.50), (@p, 'Rábano', 'lb', 5.00), (@p, 'Tomate', 'caja', 6.50), (@p, 'Jalapeño', 'lb', 25.00), (@p, 'Serrano', 'lb', 5.50);
INSERT INTO pedidos (cliente_id, fecha_esperada, cerrado_por, direccion, recibido_en, procesado, procesado_en) SELECT id, CURDATE() - INTERVAL 19 DAY, 'Memo', NULL, TIMESTAMP(CURDATE() - INTERVAL 20 DAY, '20:41:00'), 1, LEAST(TIMESTAMP(CURDATE() - INTERVAL 19 DAY, '07:10:00'), NOW() - INTERVAL 5 MINUTE) FROM clientes WHERE usuario = 'elfaco';
SET @p = LAST_INSERT_ID();
INSERT INTO pedido_lineas (pedido_id, nombre, unidad, cantidad) VALUES (@p, 'Limón', 'caja', 4.50), (@p, 'Tomatillo', 'lb', 10.00), (@p, 'Cebolla blanca', 'caja', 1.50), (@p, 'Aguacate', 'caja', 5.00), (@p, 'Jalapeño', 'lb', 20.00), (@p, 'Tomate', 'caja', 3.00), (@p, 'Cilantro', 'caja', 2.00), (@p, 'Lechuga romana', 'caja', 1.00);
INSERT INTO pedidos (cliente_id, fecha_esperada, cerrado_por, direccion, recibido_en, procesado, procesado_en) SELECT id, CURDATE() - INTERVAL 19 DAY, 'Linh', NULL, TIMESTAMP(CURDATE() - INTERVAL 20 DAY, '20:55:00'), 1, LEAST(TIMESTAMP(CURDATE() - INTERVAL 19 DAY, '06:10:00'), NOW() - INTERVAL 5 MINUTE) FROM clientes WHERE usuario = 'phsaki';
SET @p = LAST_INSERT_ID();
INSERT INTO pedido_lineas (pedido_id, nombre, unidad, cantidad) VALUES (@p, 'Ajo', 'lb', 2.50), (@p, 'Cebolla blanca', 'caja', 3.00), (@p, 'Cilantro', 'caja', 3.00), (@p, 'Jalapeño', 'lb', 22.50), (@p, 'Limón', 'caja', 4.50);
INSERT INTO pedidos (cliente_id, fecha_esperada, cerrado_por, direccion, recibido_en, procesado, procesado_en) SELECT id, CURDATE() - INTERVAL 19 DAY, 'Bricia', NULL, TIMESTAMP(CURDATE() - INTERVAL 20 DAY, '21:47:00'), 1, LEAST(TIMESTAMP(CURDATE() - INTERVAL 19 DAY, '06:50:00'), NOW() - INTERVAL 5 MINUTE) FROM clientes WHERE usuario = 'cooagu';
SET @p = LAST_INSERT_ID();
INSERT INTO pedido_lineas (pedido_id, nombre, unidad, cantidad) VALUES (@p, 'Tomatillo', 'lb', 10.00), (@p, 'Chile pasilla', 'lb', 3.00), (@p, 'Repollo', 'pieza', 10.00), (@p, 'Aguacate', 'caja', 6.00), (@p, 'Cilantro', 'caja', 2.50);
INSERT INTO pedidos (cliente_id, fecha_esperada, cerrado_por, direccion, recibido_en, procesado, procesado_en) SELECT id, CURDATE() - INTERVAL 18 DAY, 'Güero', NULL, TIMESTAMP(CURDATE() - INTERVAL 19 DAY, '17:05:00'), 1, LEAST(TIMESTAMP(CURDATE() - INTERVAL 18 DAY, '06:40:00'), NOW() - INTERVAL 5 MINUTE) FROM clientes WHERE usuario = 'maelgu';
SET @p = LAST_INSERT_ID();
INSERT INTO pedido_lineas (pedido_id, nombre, unidad, cantidad) VALUES (@p, 'Tomate', 'caja', 6.00), (@p, 'Mango', 'caja', 1.00), (@p, 'Cilantro', 'caja', 2.00), (@p, 'Aguacate', 'caja', 2.00), (@p, 'Pepino', 'caja', 1.00);
INSERT INTO pedidos (cliente_id, fecha_esperada, cerrado_por, direccion, recibido_en, procesado, procesado_en) SELECT id, CURDATE() - INTERVAL 18 DAY, 'Doña Marta', NULL, TIMESTAMP(CURDATE() - INTERVAL 19 DAY, '18:55:00'), 1, LEAST(TIMESTAMP(CURDATE() - INTERVAL 18 DAY, '07:25:00'), NOW() - INTERVAL 5 MINUTE) FROM clientes WHERE usuario = 'pusami';
SET @p = LAST_INSERT_ID();
INSERT INTO pedido_lineas (pedido_id, nombre, unidad, cantidad) VALUES (@p, 'Repollo', 'pieza', 16.00), (@p, 'Ajo', 'lb', 2.50), (@p, 'Jalapeño', 'lb', 22.50), (@p, 'Pimentón', 'caja', 0.50), (@p, 'Zanahoria', 'kg', 5.50);
INSERT INTO pedidos (cliente_id, fecha_esperada, cerrado_por, direccion, recibido_en, procesado, procesado_en) SELECT id, CURDATE() - INTERVAL 18 DAY, 'Bricia', NULL, TIMESTAMP(CURDATE() - INTERVAL 19 DAY, '21:12:00'), 1, LEAST(TIMESTAMP(CURDATE() - INTERVAL 18 DAY, '07:10:00'), NOW() - INTERVAL 5 MINUTE) FROM clientes WHERE usuario = 'cooagu';
SET @p = LAST_INSERT_ID();
INSERT INTO pedido_lineas (pedido_id, nombre, unidad, cantidad) VALUES (@p, 'Aguacate', 'caja', 4.00), (@p, 'Cilantro', 'caja', 1.00), (@p, 'Chile pasilla', 'lb', 3.25), (@p, 'Cebolla blanca', 'caja', 5.00), (@p, 'Tomate', 'caja', 3.50), (@p, 'Ajo', 'lb', 4.00), (@p, 'Repollo', 'pieza', 13.00);
INSERT INTO pedidos (cliente_id, fecha_esperada, cerrado_por, direccion, recibido_en, procesado, procesado_en) SELECT id, CURDATE() - INTERVAL 18 DAY, 'Chuy', NULL, TIMESTAMP(CURDATE() - INTERVAL 19 DAY, '21:47:00'), 1, LEAST(TIMESTAMP(CURDATE() - INTERVAL 18 DAY, '07:40:00'), NOW() - INTERVAL 5 MINUTE) FROM clientes WHERE usuario = 'armegr';
SET @p = LAST_INSERT_ID();
INSERT INTO pedido_lineas (pedido_id, nombre, unidad, cantidad) VALUES (@p, 'Tomate', 'caja', 6.50), (@p, 'Serrano', 'lb', 8.00), (@p, 'Limón', 'caja', 4.50), (@p, 'Jalapeño', 'lb', 10.00), (@p, 'Cilantro', 'caja', 2.50), (@p, 'Papa', 'kg', 12.50), (@p, 'Tomatillo', 'lb', 12.50), (@p, 'Repollo', 'pieza', 13.00);
INSERT INTO pedidos (cliente_id, fecha_esperada, cerrado_por, direccion, recibido_en, procesado, procesado_en) SELECT id, CURDATE() - INTERVAL 18 DAY, 'Sam', NULL, TIMESTAMP(CURDATE() - INTERVAL 19 DAY, '21:55:00'), 1, LEAST(TIMESTAMP(CURDATE() - INTERVAL 18 DAY, '07:25:00'), NOW() - INTERVAL 5 MINUTE) FROM clientes WHERE usuario = 'grfoca';
SET @p = LAST_INSERT_ID();
INSERT INTO pedido_lineas (pedido_id, nombre, unidad, cantidad) VALUES (@p, 'Pepino', 'caja', 3.50), (@p, 'Espinaca', 'caja', 1.50), (@p, 'Cebolla morada', 'caja', 2.00), (@p, 'Calabacín', 'caja', 1.00), (@p, 'Limón', 'caja', 1.00), (@p, 'Lechuga romana', 'caja', 3.00), (@p, 'Tomate', 'caja', 3.00), (@p, 'Naranja', 'caja', 2.00);
INSERT INTO pedidos (cliente_id, fecha_esperada, cerrado_por, direccion, recibido_en, procesado, procesado_en) SELECT id, CURDATE() - INTERVAL 18 DAY, 'Linh', NULL, TIMESTAMP(CURDATE() - INTERVAL 18 DAY, '07:15:00'), 1, LEAST(TIMESTAMP(CURDATE() - INTERVAL 18 DAY, '09:15:00'), NOW() - INTERVAL 5 MINUTE) FROM clientes WHERE usuario = 'phsaki';
SET @p = LAST_INSERT_ID();
INSERT INTO pedido_lineas (pedido_id, nombre, unidad, cantidad) VALUES (@p, 'Cebolla blanca', 'caja', 2.00), (@p, 'Cilantro', 'caja', 1.50), (@p, 'Jalapeño', 'lb', 10.00), (@p, 'Germinado de soya', 'lb', 20.00), (@p, 'Cebollín', 'caja', 2.00), (@p, 'Albahaca tailandesa', 'lb', 2.75);
INSERT INTO pedidos (cliente_id, fecha_esperada, cerrado_por, direccion, recibido_en, procesado, procesado_en) SELECT id, CURDATE() - INTERVAL 17 DAY, 'Primo Juan', NULL, TIMESTAMP(CURDATE() - INTERVAL 18 DAY, '17:20:00'), 1, LEAST(TIMESTAMP(CURDATE() - INTERVAL 17 DAY, '06:25:00'), NOW() - INTERVAL 5 MINUTE) FROM clientes WHERE usuario = 'talopr';
SET @p = LAST_INSERT_ID();
INSERT INTO pedido_lineas (pedido_id, nombre, unidad, cantidad) VALUES (@p, 'Cilantro', 'caja', 3.00), (@p, 'Jalapeño', 'lb', 10.00), (@p, 'Pepino', 'caja', 3.50), (@p, 'Cebolla blanca', 'caja', 1.50), (@p, 'Tomate', 'caja', 6.00), (@p, 'Aguacate', 'caja', 7.00);
INSERT INTO pedidos (cliente_id, fecha_esperada, cerrado_por, direccion, recibido_en, procesado, procesado_en) SELECT id, CURDATE() - INTERVAL 17 DAY, 'Sam', NULL, TIMESTAMP(CURDATE() - INTERVAL 17 DAY, '07:03:00'), 1, LEAST(TIMESTAMP(CURDATE() - INTERVAL 17 DAY, '09:03:00'), NOW() - INTERVAL 5 MINUTE) FROM clientes WHERE usuario = 'grfoca';
SET @p = LAST_INSERT_ID();
INSERT INTO pedido_lineas (pedido_id, nombre, unidad, cantidad) VALUES (@p, 'Cebolla morada', 'caja', 1.50), (@p, 'Lechuga romana', 'caja', 1.00), (@p, 'Calabacín', 'caja', 0.50), (@p, 'Naranja', 'caja', 3.00), (@p, 'Espinaca', 'caja', 2.50), (@p, 'Limón', 'caja', 5.50);
INSERT INTO pedidos (cliente_id, fecha_esperada, cerrado_por, direccion, recibido_en, procesado, procesado_en) SELECT id, CURDATE() - INTERVAL 16 DAY, 'Lupita', NULL, TIMESTAMP(CURDATE() - INTERVAL 17 DAY, '20:05:00'), 1, LEAST(TIMESTAMP(CURDATE() - INTERVAL 16 DAY, '06:40:00'), NOW() - INTERVAL 5 MINUTE) FROM clientes WHERE usuario = 'armegr';
SET @p = LAST_INSERT_ID();
INSERT INTO pedido_lineas (pedido_id, nombre, unidad, cantidad) VALUES (@p, 'Rábano', 'lb', 5.00), (@p, 'Jalapeño', 'lb', 15.00), (@p, 'Serrano', 'lb', 4.50), (@p, 'Limón', 'caja', 1.00);
INSERT INTO pedidos (cliente_id, fecha_esperada, cerrado_por, direccion, recibido_en, procesado, procesado_en) SELECT id, CURDATE() - INTERVAL 16 DAY, 'Priya', NULL, TIMESTAMP(CURDATE() - INTERVAL 16 DAY, '07:15:00'), 1, LEAST(TIMESTAMP(CURDATE() - INTERVAL 16 DAY, '09:15:00'), NOW() - INTERVAL 5 MINUTE) FROM clientes WHERE usuario = 'grfoca';
SET @p = LAST_INSERT_ID();
INSERT INTO pedido_lineas (pedido_id, nombre, unidad, cantidad) VALUES (@p, 'Tomate', 'caja', 2.50), (@p, 'Lechuga romana', 'caja', 1.00), (@p, 'Limón', 'caja', 2.00), (@p, 'Calabacín', 'caja', 1.50), (@p, 'Espinaca', 'caja', 2.50), (@p, 'Cebolla morada', 'caja', 3.00);
INSERT INTO pedidos (cliente_id, fecha_esperada, cerrado_por, direccion, recibido_en, procesado, procesado_en) SELECT id, CURDATE() - INTERVAL 15 DAY, 'Güero', NULL, TIMESTAMP(CURDATE() - INTERVAL 16 DAY, '19:20:00'), 1, LEAST(TIMESTAMP(CURDATE() - INTERVAL 15 DAY, '05:10:00'), NOW() - INTERVAL 5 MINUTE) FROM clientes WHERE usuario = 'maelgu';
SET @p = LAST_INSERT_ID();
INSERT INTO pedido_lineas (pedido_id, nombre, unidad, cantidad) VALUES (@p, 'Serrano', 'lb', 2.00), (@p, 'Cebolla morada', 'caja', 0.50), (@p, 'Pepino', 'caja', 2.00), (@p, 'Aguacate', 'caja', 10.00);
INSERT INTO pedidos (cliente_id, fecha_esperada, cerrado_por, direccion, recibido_en, procesado, procesado_en) SELECT id, CURDATE() - INTERVAL 14 DAY, 'Alicia', NULL, TIMESTAMP(CURDATE() - INTERVAL 15 DAY, '22:05:00'), 1, LEAST(TIMESTAMP(CURDATE() - INTERVAL 14 DAY, '05:25:00'), NOW() - INTERVAL 5 MINUTE) FROM clientes WHERE usuario = 'elfaco';
SET @p = LAST_INSERT_ID();
INSERT INTO pedido_lineas (pedido_id, nombre, unidad, cantidad) VALUES (@p, 'Cilantro', 'caja', 3.00), (@p, 'Tomatillo', 'lb', 7.50), (@p, 'Tomate', 'caja', 2.50), (@p, 'Papa', 'kg', 15.00), (@p, 'Limón', 'caja', 3.50), (@p, 'Aguacate', 'caja', 10.00), (@p, 'Lechuga romana', 'caja', 3.00);
INSERT INTO pedidos (cliente_id, fecha_esperada, cerrado_por, direccion, recibido_en, procesado, procesado_en) SELECT id, CURDATE() - INTERVAL 14 DAY, 'Lupita', NULL, TIMESTAMP(CURDATE() - INTERVAL 14 DAY, '07:15:00'), 1, LEAST(TIMESTAMP(CURDATE() - INTERVAL 14 DAY, '09:15:00'), NOW() - INTERVAL 5 MINUTE) FROM clientes WHERE usuario = 'armegr';
SET @p = LAST_INSERT_ID();
INSERT INTO pedido_lineas (pedido_id, nombre, unidad, cantidad) VALUES (@p, 'Rábano', 'lb', 3.50), (@p, 'Aguacate', 'caja', 10.00), (@p, 'Tomatillo', 'lb', 20.00), (@p, 'Tomate', 'caja', 3.00);
INSERT INTO pedidos (cliente_id, fecha_esperada, cerrado_por, direccion, recibido_en, procesado, procesado_en) SELECT id, CURDATE() - INTERVAL 13 DAY, 'Linh', NULL, TIMESTAMP(CURDATE() - INTERVAL 14 DAY, '20:12:00'), 1, LEAST(TIMESTAMP(CURDATE() - INTERVAL 13 DAY, '07:10:00'), NOW() - INTERVAL 5 MINUTE) FROM clientes WHERE usuario = 'phsaki';
SET @p = LAST_INSERT_ID();
INSERT INTO pedido_lineas (pedido_id, nombre, unidad, cantidad) VALUES (@p, 'Albahaca tailandesa', 'lb', 1.00), (@p, 'Germinado de soya', 'lb', 17.50), (@p, 'Ajo', 'lb', 2.00), (@p, 'Jalapeño', 'lb', 15.00), (@p, 'Limón', 'caja', 3.00), (@p, 'Cilantro', 'caja', 2.50), (@p, 'Cebollín', 'caja', 1.50), (@p, 'Cebolla blanca', 'caja', 3.50);
INSERT INTO pedidos (cliente_id, fecha_esperada, cerrado_por, direccion, recibido_en, procesado, procesado_en) SELECT id, CURDATE() - INTERVAL 12 DAY, 'Kevin', NULL, TIMESTAMP(CURDATE() - INTERVAL 13 DAY, '21:12:00'), 1, LEAST(TIMESTAMP(CURDATE() - INTERVAL 12 DAY, '05:10:00'), NOW() - INTERVAL 5 MINUTE) FROM clientes WHERE usuario = 'pusami';
SET @p = LAST_INSERT_ID();
INSERT INTO pedido_lineas (pedido_id, nombre, unidad, cantidad) VALUES (@p, 'Jalapeño', 'lb', 17.50), (@p, 'Zanahoria', 'kg', 4.75), (@p, 'Ajo', 'lb', 3.50), (@p, 'Repollo', 'pieza', 8.00), (@p, 'Tomate', 'caja', 3.50), (@p, 'Cebolla blanca', 'caja', 5.00);
INSERT INTO pedidos (cliente_id, fecha_esperada, cerrado_por, direccion, recibido_en, procesado, procesado_en) SELECT id, CURDATE() - INTERVAL 11 DAY, 'Bricia', NULL, TIMESTAMP(CURDATE() - INTERVAL 12 DAY, '19:20:00'), 1, LEAST(TIMESTAMP(CURDATE() - INTERVAL 11 DAY, '07:50:00'), NOW() - INTERVAL 5 MINUTE) FROM clientes WHERE usuario = 'cooagu';
SET @p = LAST_INSERT_ID();
INSERT INTO pedido_lineas (pedido_id, nombre, unidad, cantidad) VALUES (@p, 'Ajo', 'lb', 4.50), (@p, 'Aguacate', 'caja', 6.00), (@p, 'Chile pasilla', 'lb', 2.00), (@p, 'Cilantro', 'caja', 3.00), (@p, 'Cebolla blanca', 'caja', 2.50), (@p, 'Tomate', 'caja', 3.00), (@p, 'Limón', 'caja', 3.50), (@p, 'Rábano', 'lb', 5.00);
INSERT INTO pedidos (cliente_id, fecha_esperada, cerrado_por, direccion, recibido_en, procesado, procesado_en) SELECT id, CURDATE() - INTERVAL 11 DAY, 'Primo Juan', NULL, TIMESTAMP(CURDATE() - INTERVAL 12 DAY, '19:55:00'), 1, LEAST(TIMESTAMP(CURDATE() - INTERVAL 11 DAY, '05:40:00'), NOW() - INTERVAL 5 MINUTE) FROM clientes WHERE usuario = 'talopr';
SET @p = LAST_INSERT_ID();
INSERT INTO pedido_lineas (pedido_id, nombre, unidad, cantidad) VALUES (@p, 'Jalapeño', 'lb', 12.50), (@p, 'Rábano', 'lb', 3.00), (@p, 'Aguacate', 'caja', 9.00), (@p, 'Limón', 'caja', 5.50), (@p, 'Tomate', 'caja', 7.00), (@p, 'Cilantro', 'caja', 3.00), (@p, 'Pepino', 'caja', 1.50);
INSERT INTO pedidos (cliente_id, fecha_esperada, cerrado_por, direccion, recibido_en, procesado, procesado_en) SELECT id, CURDATE() - INTERVAL 10 DAY, 'Marco', NULL, TIMESTAMP(CURDATE() - INTERVAL 11 DAY, '22:34:00'), 1, LEAST(TIMESTAMP(CURDATE() - INTERVAL 10 DAY, '06:10:00'), NOW() - INTERVAL 5 MINUTE) FROM clientes WHERE usuario = 'armegr';
SET @p = LAST_INSERT_ID();
INSERT INTO pedido_lineas (pedido_id, nombre, unidad, cantidad) VALUES (@p, 'Serrano', 'lb', 7.00), (@p, 'Cebolla blanca', 'caja', 4.00), (@p, 'Limón', 'caja', 4.00), (@p, 'Repollo', 'pieza', 4.00), (@p, 'Tomatillo', 'lb', 15.00);
INSERT INTO pedidos (cliente_id, fecha_esperada, cerrado_por, direccion, recibido_en, procesado, procesado_en) SELECT id, CURDATE() - INTERVAL 9 DAY, 'Nayeli', NULL, TIMESTAMP(CURDATE() - INTERVAL 10 DAY, '17:12:00'), 1, LEAST(TIMESTAMP(CURDATE() - INTERVAL 9 DAY, '06:25:00'), NOW() - INTERVAL 5 MINUTE) FROM clientes WHERE usuario = 'maelgu';
SET @p = LAST_INSERT_ID();
INSERT INTO pedido_lineas (pedido_id, nombre, unidad, cantidad) VALUES (@p, 'Mango', 'caja', 1.00), (@p, 'Tomate', 'caja', 6.00), (@p, 'Cebolla morada', 'caja', 3.00), (@p, 'Serrano', 'lb', 3.50), (@p, 'Aguacate', 'caja', 10.00);
INSERT INTO pedidos (cliente_id, fecha_esperada, cerrado_por, direccion, recibido_en, procesado, procesado_en) SELECT id, CURDATE() - INTERVAL 9 DAY, 'Beto', NULL, TIMESTAMP(CURDATE() - INTERVAL 10 DAY, '18:47:00'), 1, LEAST(TIMESTAMP(CURDATE() - INTERVAL 9 DAY, '05:40:00'), NOW() - INTERVAL 5 MINUTE) FROM clientes WHERE usuario = 'talapa';
SET @p = LAST_INSERT_ID();
INSERT INTO pedido_lineas (pedido_id, nombre, unidad, cantidad) VALUES (@p, 'Cilantro', 'caja', 2.50), (@p, 'Tomate', 'caja', 7.00), (@p, 'Tomatillo', 'lb', 15.00), (@p, 'Limón', 'caja', 4.00), (@p, 'Rábano', 'lb', 5.50), (@p, 'Cebolla blanca', 'caja', 4.50), (@p, 'Aguacate', 'caja', 7.00);
INSERT INTO pedidos (cliente_id, fecha_esperada, cerrado_por, direccion, recibido_en, procesado, procesado_en) SELECT id, CURDATE() - INTERVAL 9 DAY, 'Linh', NULL, TIMESTAMP(CURDATE() - INTERVAL 10 DAY, '20:20:00'), 1, LEAST(TIMESTAMP(CURDATE() - INTERVAL 9 DAY, '06:40:00'), NOW() - INTERVAL 5 MINUTE) FROM clientes WHERE usuario = 'phsaki';
SET @p = LAST_INSERT_ID();
INSERT INTO pedido_lineas (pedido_id, nombre, unidad, cantidad) VALUES (@p, 'Limón', 'caja', 5.00), (@p, 'Germinado de soya', 'lb', 30.00), (@p, 'Cebolla blanca', 'caja', 2.50), (@p, 'Ajo', 'lb', 4.50), (@p, 'Jalapeño', 'lb', 17.50), (@p, 'Cebollín', 'caja', 1.50), (@p, 'Cilantro', 'caja', 1.50);
INSERT INTO pedidos (cliente_id, fecha_esperada, cerrado_por, direccion, recibido_en, procesado, procesado_en) SELECT id, CURDATE() - INTERVAL 9 DAY, 'Priya', NULL, TIMESTAMP(CURDATE() - INTERVAL 10 DAY, '20:55:00'), 1, LEAST(TIMESTAMP(CURDATE() - INTERVAL 9 DAY, '05:40:00'), NOW() - INTERVAL 5 MINUTE) FROM clientes WHERE usuario = 'grfoca';
SET @p = LAST_INSERT_ID();
INSERT INTO pedido_lineas (pedido_id, nombre, unidad, cantidad) VALUES (@p, 'Aguacate', 'caja', 7.00), (@p, 'Lechuga romana', 'caja', 3.00), (@p, 'Tomate', 'caja', 6.00), (@p, 'Naranja', 'caja', 3.00), (@p, 'Limón', 'caja', 4.00), (@p, 'Cebolla morada', 'caja', 1.50), (@p, 'Calabacín', 'caja', 1.00);
INSERT INTO pedidos (cliente_id, fecha_esperada, cerrado_por, direccion, recibido_en, procesado, procesado_en) SELECT id, CURDATE() - INTERVAL 8 DAY, 'Primo Luis', NULL, TIMESTAMP(CURDATE() - INTERVAL 9 DAY, '19:55:00'), 1, LEAST(TIMESTAMP(CURDATE() - INTERVAL 8 DAY, '07:50:00'), NOW() - INTERVAL 5 MINUTE) FROM clientes WHERE usuario = 'talopr';
SET @p = LAST_INSERT_ID();
INSERT INTO pedido_lineas (pedido_id, nombre, unidad, cantidad) VALUES (@p, 'Limón', 'caja', 1.00), (@p, 'Rábano', 'lb', 5.50), (@p, 'Pepino', 'caja', 1.50), (@p, 'Tomate', 'caja', 3.50), (@p, 'Jalapeño', 'lb', 20.00), (@p, 'Aguacate', 'caja', 10.00), (@p, 'Cebolla blanca', 'caja', 5.00), (@p, 'Cilantro', 'caja', 1.00);
INSERT INTO pedidos (cliente_id, fecha_esperada, cerrado_por, direccion, recibido_en, procesado, procesado_en) SELECT id, CURDATE() - INTERVAL 7 DAY, 'Primo Luis', NULL, TIMESTAMP(CURDATE() - INTERVAL 8 DAY, '18:12:00'), 1, LEAST(TIMESTAMP(CURDATE() - INTERVAL 7 DAY, '05:50:00'), NOW() - INTERVAL 5 MINUTE) FROM clientes WHERE usuario = 'talopr';
SET @p = LAST_INSERT_ID();
INSERT INTO pedido_lineas (pedido_id, nombre, unidad, cantidad) VALUES (@p, 'Cebolla blanca', 'caja', 1.00), (@p, 'Jalapeño', 'lb', 10.00), (@p, 'Pepino', 'caja', 3.00), (@p, 'Aguacate', 'caja', 5.00), (@p, 'Tomate', 'caja', 2.50), (@p, 'Cilantro', 'caja', 2.00), (@p, 'Limón', 'caja', 6.00), (@p, 'Rábano', 'lb', 5.00);
INSERT INTO pedidos (cliente_id, fecha_esperada, cerrado_por, direccion, recibido_en, procesado, procesado_en) SELECT id, CURDATE() - INTERVAL 7 DAY, 'Beto', NULL, TIMESTAMP(CURDATE() - INTERVAL 8 DAY, '21:20:00'), 1, LEAST(TIMESTAMP(CURDATE() - INTERVAL 7 DAY, '07:10:00'), NOW() - INTERVAL 5 MINUTE) FROM clientes WHERE usuario = 'talapa';
SET @p = LAST_INSERT_ID();
INSERT INTO pedido_lineas (pedido_id, nombre, unidad, cantidad) VALUES (@p, 'Cilantro', 'caja', 2.50), (@p, 'Tomatillo', 'lb', 12.50), (@p, 'Aguacate', 'caja', 10.00), (@p, 'Jalapeño', 'lb', 5.00);
INSERT INTO pedidos (cliente_id, fecha_esperada, cerrado_por, direccion, recibido_en, procesado, procesado_en) SELECT id, CURDATE() - INTERVAL 7 DAY, 'Lupita', NULL, TIMESTAMP(CURDATE() - INTERVAL 8 DAY, '21:47:00'), 1, LEAST(TIMESTAMP(CURDATE() - INTERVAL 7 DAY, '06:25:00'), NOW() - INTERVAL 5 MINUTE) FROM clientes WHERE usuario = 'armegr';
SET @p = LAST_INSERT_ID();
INSERT INTO pedido_lineas (pedido_id, nombre, unidad, cantidad) VALUES (@p, 'Papa', 'kg', 25.00), (@p, 'Serrano', 'lb', 8.00), (@p, 'Aguacate', 'caja', 2.00), (@p, 'Cilantro', 'caja', 3.00), (@p, 'Rábano', 'lb', 2.00), (@p, 'Jalapeño', 'lb', 15.00), (@p, 'Cebolla blanca', 'caja', 3.00), (@p, 'Lechuga romana', 'caja', 2.00);
INSERT INTO pedidos (cliente_id, fecha_esperada, cerrado_por, direccion, recibido_en, procesado, procesado_en) SELECT id, CURDATE() - INTERVAL 6 DAY, 'Rosa', NULL, TIMESTAMP(CURDATE() - INTERVAL 7 DAY, '20:12:00'), 1, LEAST(TIMESTAMP(CURDATE() - INTERVAL 6 DAY, '05:25:00'), NOW() - INTERVAL 5 MINUTE) FROM clientes WHERE usuario = 'talapa';
SET @p = LAST_INSERT_ID();
INSERT INTO pedido_lineas (pedido_id, nombre, unidad, cantidad) VALUES (@p, 'Aguacate', 'caja', 7.00), (@p, 'Rábano', 'lb', 5.00), (@p, 'Tomate', 'caja', 2.00), (@p, 'Limón', 'caja', 4.50), (@p, 'Cebolla blanca', 'caja', 5.00), (@p, 'Cilantro', 'caja', 2.00), (@p, 'Jalapeño', 'lb', 15.00);
INSERT INTO pedidos (cliente_id, fecha_esperada, cerrado_por, direccion, recibido_en, procesado, procesado_en) SELECT id, CURDATE() - INTERVAL 6 DAY, 'Chuy', NULL, TIMESTAMP(CURDATE() - INTERVAL 7 DAY, '21:47:00'), 1, LEAST(TIMESTAMP(CURDATE() - INTERVAL 6 DAY, '05:10:00'), NOW() - INTERVAL 5 MINUTE) FROM clientes WHERE usuario = 'armegr';
SET @p = LAST_INSERT_ID();
INSERT INTO pedido_lineas (pedido_id, nombre, unidad, cantidad) VALUES (@p, 'Papa', 'kg', 12.50), (@p, 'Aguacate', 'caja', 5.00), (@p, 'Limón', 'caja', 1.50), (@p, 'Tomatillo', 'lb', 20.00), (@p, 'Serrano', 'lb', 2.50), (@p, 'Tomate', 'caja', 4.50);
INSERT INTO pedidos (cliente_id, fecha_esperada, cerrado_por, direccion, recibido_en, procesado, procesado_en) SELECT id, CURDATE() - INTERVAL 5 DAY, 'Tran', NULL, TIMESTAMP(CURDATE() - INTERVAL 6 DAY, '18:20:00'), 1, LEAST(TIMESTAMP(CURDATE() - INTERVAL 5 DAY, '05:10:00'), NOW() - INTERVAL 5 MINUTE) FROM clientes WHERE usuario = 'phsaki';
SET @p = LAST_INSERT_ID();
INSERT INTO pedido_lineas (pedido_id, nombre, unidad, cantidad) VALUES (@p, 'Cilantro', 'caja', 2.50), (@p, 'Germinado de soya', 'lb', 27.50), (@p, 'Cebolla blanca', 'caja', 1.50), (@p, 'Ajo', 'lb', 4.00), (@p, 'Cebollín', 'caja', 2.00), (@p, 'Jalapeño', 'lb', 22.50);
INSERT INTO pedidos (cliente_id, fecha_esperada, cerrado_por, direccion, recibido_en, procesado, procesado_en) SELECT id, CURDATE() - INTERVAL 4 DAY, 'Doña Marta', NULL, TIMESTAMP(CURDATE() - INTERVAL 5 DAY, '19:55:00'), 1, LEAST(TIMESTAMP(CURDATE() - INTERVAL 4 DAY, '05:10:00'), NOW() - INTERVAL 5 MINUTE) FROM clientes WHERE usuario = 'pusami';
SET @p = LAST_INSERT_ID();
INSERT INTO pedido_lineas (pedido_id, nombre, unidad, cantidad) VALUES (@p, 'Pimentón', 'caja', 2.00), (@p, 'Zanahoria', 'kg', 12.25), (@p, 'Cebolla blanca', 'caja', 1.00), (@p, 'Ajo', 'lb', 3.50), (@p, 'Jalapeño', 'lb', 25.00), (@p, 'Tomate', 'caja', 3.00), (@p, 'Repollo', 'pieza', 12.00);
INSERT INTO pedidos (cliente_id, fecha_esperada, cerrado_por, direccion, recibido_en, procesado, procesado_en) SELECT id, CURDATE() - INTERVAL 4 DAY, 'Marco', NULL, TIMESTAMP(CURDATE() - INTERVAL 5 DAY, '20:12:00'), 1, LEAST(TIMESTAMP(CURDATE() - INTERVAL 4 DAY, '06:50:00'), NOW() - INTERVAL 5 MINUTE) FROM clientes WHERE usuario = 'armegr';
SET @p = LAST_INSERT_ID();
INSERT INTO pedido_lineas (pedido_id, nombre, unidad, cantidad) VALUES (@p, 'Papa', 'kg', 10.00), (@p, 'Cebolla blanca', 'caja', 3.50), (@p, 'Repollo', 'pieza', 15.00), (@p, 'Serrano', 'lb', 3.00);
INSERT INTO pedidos (cliente_id, fecha_esperada, cerrado_por, direccion, recibido_en, procesado, procesado_en) SELECT id, CURDATE() - INTERVAL 4 DAY, 'Beto', NULL, TIMESTAMP(CURDATE() - INTERVAL 5 DAY, '21:34:00'), 1, LEAST(TIMESTAMP(CURDATE() - INTERVAL 4 DAY, '06:10:00'), NOW() - INTERVAL 5 MINUTE) FROM clientes WHERE usuario = 'talapa';
SET @p = LAST_INSERT_ID();
INSERT INTO pedido_lineas (pedido_id, nombre, unidad, cantidad) VALUES (@p, 'Tomatillo', 'lb', 7.50), (@p, 'Jalapeño', 'lb', 10.00), (@p, 'Aguacate', 'caja', 9.00), (@p, 'Tomate', 'caja', 3.50), (@p, 'Rábano', 'lb', 2.50);
INSERT INTO pedidos (cliente_id, fecha_esperada, cerrado_por, direccion, recibido_en, procesado, procesado_en) SELECT id, CURDATE() - INTERVAL 3 DAY, 'Beto', NULL, TIMESTAMP(CURDATE() - INTERVAL 3 DAY, '08:03:00'), 1, LEAST(TIMESTAMP(CURDATE() - INTERVAL 3 DAY, '10:03:00'), NOW() - INTERVAL 5 MINUTE) FROM clientes WHERE usuario = 'talapa';
SET @p = LAST_INSERT_ID();
INSERT INTO pedido_lineas (pedido_id, nombre, unidad, cantidad) VALUES (@p, 'Limón', 'caja', 3.50), (@p, 'Cilantro', 'caja', 0.50), (@p, 'Tomatillo', 'lb', 10.00), (@p, 'Repollo', 'pieza', 6.00);
INSERT INTO pedidos (cliente_id, fecha_esperada, cerrado_por, direccion, recibido_en, procesado, procesado_en) SELECT id, CURDATE() - INTERVAL 2 DAY, 'Doña Marta', NULL, TIMESTAMP(CURDATE() - INTERVAL 3 DAY, '19:05:00'), 1, LEAST(TIMESTAMP(CURDATE() - INTERVAL 2 DAY, '07:25:00'), NOW() - INTERVAL 5 MINUTE) FROM clientes WHERE usuario = 'pusami';
SET @p = LAST_INSERT_ID();
INSERT INTO pedido_lineas (pedido_id, nombre, unidad, cantidad) VALUES (@p, 'Zanahoria', 'kg', 6.25), (@p, 'Ajo', 'lb', 1.00), (@p, 'Repollo', 'pieza', 8.00), (@p, 'Cebolla blanca', 'caja', 1.00);
INSERT INTO pedidos (cliente_id, fecha_esperada, cerrado_por, direccion, recibido_en, procesado, procesado_en) SELECT id, CURDATE() - INTERVAL 2 DAY, 'Tran', NULL, TIMESTAMP(CURDATE() - INTERVAL 3 DAY, '21:12:00'), 1, LEAST(TIMESTAMP(CURDATE() - INTERVAL 2 DAY, '05:25:00'), NOW() - INTERVAL 5 MINUTE) FROM clientes WHERE usuario = 'phsaki';
SET @p = LAST_INSERT_ID();
INSERT INTO pedido_lineas (pedido_id, nombre, unidad, cantidad) VALUES (@p, 'Jalapeño', 'lb', 5.00), (@p, 'Cilantro', 'caja', 0.50), (@p, 'Ajo', 'lb', 4.00), (@p, 'Cebollín', 'caja', 2.00), (@p, 'Germinado de soya', 'lb', 30.00), (@p, 'Cebolla blanca', 'caja', 1.50);
INSERT INTO pedidos (cliente_id, fecha_esperada, cerrado_por, direccion, recibido_en, procesado, procesado_en) SELECT id, CURDATE() - INTERVAL 2 DAY, 'Memo', NULL, TIMESTAMP(CURDATE() - INTERVAL 3 DAY, '21:12:00'), 0, NULL FROM clientes WHERE usuario = 'elfaco';
SET @p = LAST_INSERT_ID();
INSERT INTO pedido_lineas (pedido_id, nombre, unidad, cantidad) VALUES (@p, 'Tomate', 'caja', 5.00), (@p, 'Cebolla blanca', 'caja', 4.50), (@p, 'Cilantro', 'caja', 2.50), (@p, 'Aguacate', 'caja', 7.00), (@p, 'Limón', 'caja', 5.50);
INSERT INTO pedidos (cliente_id, fecha_esperada, cerrado_por, direccion, recibido_en, procesado, procesado_en) SELECT id, CURDATE() - INTERVAL 1 DAY, 'Marco', NULL, TIMESTAMP(CURDATE() - INTERVAL 2 DAY, '20:55:00'), 1, LEAST(TIMESTAMP(CURDATE() - INTERVAL 1 DAY, '07:25:00'), NOW() - INTERVAL 5 MINUTE) FROM clientes WHERE usuario = 'armegr';
SET @p = LAST_INSERT_ID();
INSERT INTO pedido_lineas (pedido_id, nombre, unidad, cantidad) VALUES (@p, 'Tomatillo', 'lb', 17.50), (@p, 'Cebolla blanca', 'caja', 2.00), (@p, 'Tomate', 'caja', 6.50), (@p, 'Jalapeño', 'lb', 25.00), (@p, 'Rábano', 'lb', 3.50);
INSERT INTO pedidos (cliente_id, fecha_esperada, cerrado_por, direccion, recibido_en, procesado, procesado_en) SELECT id, CURDATE() - INTERVAL 1 DAY, 'Rosa', NULL, TIMESTAMP(CURDATE() - INTERVAL 2 DAY, '21:12:00'), 0, NULL FROM clientes WHERE usuario = 'talapa';
SET @p = LAST_INSERT_ID();
INSERT INTO pedido_lineas (pedido_id, nombre, unidad, cantidad) VALUES (@p, 'Tomate', 'caja', 5.00), (@p, 'Cebolla blanca', 'caja', 3.50), (@p, 'Cilantro', 'caja', 0.50), (@p, 'Aguacate', 'caja', 7.00), (@p, 'Limón', 'caja', 4.00);
INSERT INTO pedidos (cliente_id, fecha_esperada, cerrado_por, direccion, recibido_en, procesado, procesado_en) SELECT id, CURDATE() - INTERVAL 1 DAY, 'Nayeli', NULL, TIMESTAMP(CURDATE() - INTERVAL 2 DAY, '22:20:00'), 1, LEAST(TIMESTAMP(CURDATE() - INTERVAL 1 DAY, '05:10:00'), NOW() - INTERVAL 5 MINUTE) FROM clientes WHERE usuario = 'maelgu';
SET @p = LAST_INSERT_ID();
INSERT INTO pedido_lineas (pedido_id, nombre, unidad, cantidad) VALUES (@p, 'Pepino', 'caja', 3.50), (@p, 'Mango', 'caja', 3.00), (@p, 'Limón', 'caja', 3.50), (@p, 'Cilantro', 'caja', 2.50), (@p, 'Aguacate', 'caja', 7.00), (@p, 'Cebolla morada', 'caja', 0.50), (@p, 'Serrano', 'lb', 7.50), (@p, 'Tomate', 'caja', 7.00);
INSERT INTO pedidos (cliente_id, fecha_esperada, cerrado_por, direccion, recibido_en, procesado, procesado_en) SELECT id, CURDATE() - INTERVAL 0 DAY, 'Beto', NULL, TIMESTAMP(CURDATE() - INTERVAL 1 DAY, '17:12:00'), 0, NULL FROM clientes WHERE usuario = 'talapa';
SET @p = LAST_INSERT_ID();
INSERT INTO pedido_lineas (pedido_id, nombre, unidad, cantidad) VALUES (@p, 'Cilantro', 'caja', 1.00), (@p, 'Rábano', 'lb', 5.00), (@p, 'Tomatillo', 'lb', 17.50), (@p, 'Tomate', 'caja', 7.00), (@p, 'Aguacate', 'caja', 2.00), (@p, 'Repollo', 'pieza', 11.00);
INSERT INTO pedidos (cliente_id, fecha_esperada, cerrado_por, direccion, recibido_en, procesado, procesado_en) SELECT id, CURDATE() - INTERVAL 0 DAY, 'Kevin', NULL, TIMESTAMP(CURDATE() - INTERVAL 1 DAY, '19:41:00'), 0, NULL FROM clientes WHERE usuario = 'pusami';
SET @p = LAST_INSERT_ID();
INSERT INTO pedido_lineas (pedido_id, nombre, unidad, cantidad) VALUES (@p, 'Zanahoria', 'kg', 11.50), (@p, 'Tomate', 'caja', 6.00), (@p, 'Pimentón', 'caja', 2.00), (@p, 'Cebolla blanca', 'caja', 2.50);
INSERT INTO pedidos (cliente_id, fecha_esperada, cerrado_por, direccion, recibido_en, procesado, procesado_en) SELECT id, CURDATE() - INTERVAL 0 DAY, 'Chuy', NULL, TIMESTAMP(CURDATE() - INTERVAL 1 DAY, '21:47:00'), 1, LEAST(TIMESTAMP(CURDATE() - INTERVAL 0 DAY, '06:10:00'), NOW() - INTERVAL 5 MINUTE) FROM clientes WHERE usuario = 'armegr';
SET @p = LAST_INSERT_ID();
INSERT INTO pedido_lineas (pedido_id, nombre, unidad, cantidad) VALUES (@p, 'Jalapeño', 'lb', 12.50), (@p, 'Cilantro', 'caja', 3.00), (@p, 'Tomatillo', 'lb', 12.50), (@p, 'Cebolla blanca', 'caja', 2.00);
INSERT INTO pedidos (cliente_id, fecha_esperada, cerrado_por, direccion, recibido_en, procesado, procesado_en) SELECT id, CURDATE() - INTERVAL 0 DAY, 'Bricia', NULL, TIMESTAMP(CURDATE() - INTERVAL 1 DAY, '22:20:00'), 1, LEAST(TIMESTAMP(CURDATE() - INTERVAL 0 DAY, '07:50:00'), NOW() - INTERVAL 5 MINUTE) FROM clientes WHERE usuario = 'cooagu';
SET @p = LAST_INSERT_ID();
INSERT INTO pedido_lineas (pedido_id, nombre, unidad, cantidad) VALUES (@p, 'Cilantro', 'caja', 1.50), (@p, 'Rábano', 'lb', 4.50), (@p, 'Chile pasilla', 'lb', 1.50), (@p, 'Aguacate', 'caja', 3.00), (@p, 'Repollo', 'pieza', 13.00), (@p, 'Ajo', 'lb', 5.00), (@p, 'Limón', 'caja', 1.00);
INSERT INTO pedidos (cliente_id, fecha_esperada, cerrado_por, direccion, recibido_en, procesado, procesado_en) SELECT id, CURDATE() - INTERVAL 0 DAY, 'Linh', NULL, NOW() - INTERVAL 119 MINUTE, 0, NULL FROM clientes WHERE usuario = 'phsaki';
SET @p = LAST_INSERT_ID();
INSERT INTO pedido_lineas (pedido_id, nombre, unidad, cantidad) VALUES (@p, 'Cilantro', 'caja', 1.50), (@p, 'Germinado de soya', 'lb', 15.00), (@p, 'Cebollín', 'caja', 2.00), (@p, 'Ajo', 'lb', 2.00), (@p, 'Albahaca tailandesa', 'lb', 2.75);
INSERT INTO pedidos (cliente_id, fecha_esperada, cerrado_por, direccion, recibido_en, procesado, procesado_en) SELECT id, CURDATE() - INTERVAL 0 DAY, 'Memo', NULL, NOW() - INTERVAL 102 MINUTE, 1, NOW() - INTERVAL 3 MINUTE FROM clientes WHERE usuario = 'elfaco';
SET @p = LAST_INSERT_ID();
INSERT INTO pedido_lineas (pedido_id, nombre, unidad, cantidad) VALUES (@p, 'Papa', 'kg', 20.00), (@p, 'Limón', 'caja', 2.50), (@p, 'Lechuga romana', 'caja', 1.00), (@p, 'Jalapeño', 'lb', 20.00), (@p, 'Tomatillo', 'lb', 15.00), (@p, 'Cilantro', 'caja', 2.00), (@p, 'Cebolla blanca', 'caja', 4.00), (@p, 'Aguacate', 'caja', 7.00);
INSERT INTO pedidos (cliente_id, fecha_esperada, cerrado_por, direccion, recibido_en, procesado, procesado_en) SELECT id, CURDATE() + INTERVAL 1 DAY, 'Bricia', NULL, NOW() - INTERVAL 85 MINUTE, 0, NULL FROM clientes WHERE usuario = 'cooagu';
SET @p = LAST_INSERT_ID();
INSERT INTO pedido_lineas (pedido_id, nombre, unidad, cantidad) VALUES (@p, 'Ajo', 'lb', 4.00), (@p, 'Cebolla blanca', 'caja', 2.00), (@p, 'Chile pasilla', 'lb', 1.25), (@p, 'Rábano', 'lb', 2.00), (@p, 'Tomate', 'caja', 7.00), (@p, 'Cilantro', 'caja', 2.00);
INSERT INTO pedidos (cliente_id, fecha_esperada, cerrado_por, direccion, recibido_en, procesado, procesado_en) SELECT id, CURDATE() + INTERVAL 1 DAY, 'Alicia', NULL, NOW() - INTERVAL 68 MINUTE, 0, NULL FROM clientes WHERE usuario = 'elfaco';
SET @p = LAST_INSERT_ID();
INSERT INTO pedido_lineas (pedido_id, nombre, unidad, cantidad) VALUES (@p, 'Papa', 'kg', 20.00), (@p, 'Aguacate', 'caja', 6.00), (@p, 'Tomatillo', 'lb', 10.00), (@p, 'Tomate', 'caja', 8.00), (@p, 'Cilantro', 'caja', 2.00), (@p, 'Cebolla blanca', 'caja', 1.50), (@p, 'Jalapeño', 'lb', 12.50), (@p, 'Limón', 'caja', 3.50);
INSERT INTO pedidos (cliente_id, fecha_esperada, cerrado_por, direccion, recibido_en, procesado, procesado_en) SELECT id, CURDATE() + INTERVAL 1 DAY, 'Beto', NULL, NOW() - INTERVAL 51 MINUTE, 0, NULL FROM clientes WHERE usuario = 'talapa';
SET @p = LAST_INSERT_ID();
INSERT INTO pedido_lineas (pedido_id, nombre, unidad, cantidad) VALUES (@p, 'Cebolla blanca', 'caja', 2.00), (@p, 'Tomatillo', 'lb', 12.50), (@p, 'Rábano', 'lb', 5.00), (@p, 'Cilantro', 'caja', 0.50);
INSERT INTO pedidos (cliente_id, fecha_esperada, cerrado_por, direccion, recibido_en, procesado, procesado_en) SELECT id, CURDATE() + INTERVAL 2 DAY, 'Chuy', NULL, NOW() - INTERVAL 34 MINUTE, 0, NULL FROM clientes WHERE usuario = 'armegr';
SET @p = LAST_INSERT_ID();
INSERT INTO pedido_lineas (pedido_id, nombre, unidad, cantidad) VALUES (@p, 'Repollo', 'pieza', 4.00), (@p, 'Limón', 'caja', 5.00), (@p, 'Aguacate', 'caja', 6.00), (@p, 'Serrano', 'lb', 6.00), (@p, 'Cilantro', 'caja', 2.00), (@p, 'Rábano', 'lb', 4.00), (@p, 'Papa', 'kg', 17.50), (@p, 'Tomatillo', 'lb', 17.50);
INSERT INTO pedidos (cliente_id, fecha_esperada, cerrado_por, direccion, recibido_en, procesado, procesado_en) SELECT id, CURDATE() + INTERVAL 1 DAY, 'Chuy', NULL, NOW() - INTERVAL 17 MINUTE, 0, NULL FROM clientes WHERE usuario = 'armegr';
SET @p = LAST_INSERT_ID();
INSERT INTO pedido_lineas (pedido_id, nombre, unidad, cantidad) VALUES (@p, 'Lechuga romana', 'caja', 1.00), (@p, 'Tomatillo', 'lb', 5.00), (@p, 'Cilantro', 'caja', 0.50), (@p, 'Papa', 'kg', 12.50), (@p, 'Aguacate', 'caja', 8.00), (@p, 'Repollo', 'pieza', 5.00), (@p, 'Tomate', 'caja', 5.50), (@p, 'Limón', 'caja', 5.50);

COMMIT;
